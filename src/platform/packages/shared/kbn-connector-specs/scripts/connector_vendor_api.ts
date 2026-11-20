/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { run } from '@kbn/dev-cli-runner';
import { createFailError, createFlagError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import { timeoutSignal } from '@kbn/std';
import { getCodeOwnersEntries, getOwningTeamsForPath } from '@kbn/code-owners';
import type { DriftReportEntry } from '../src/test/vendor_api/drift/detect_drift';
import { detectDrift } from '../src/test/vendor_api/drift/detect_drift';
import {
  findConnector,
  findVendorApiDirectory,
  listConnectors,
} from '../src/test/vendor_api/find_connector';
import {
  collectCoverage,
  serializeCoverage,
} from '../src/test/vendor_api/connector_coverage/collect_coverage';
import { createGhIssueTracker } from '../src/test/vendor_api/drift/gh_issue_tracker';
import { inspectVendorApi } from '../src/test/vendor_api/inspect/inspect_vendor_api';
import type { MarkdownSourceFormat, ProtocolFormat } from '../src/test/vendor_api/manifest';
import {
  markdownSourceFormatSchema,
  protocolSourceFormatSchema,
  SOURCE_NAME_PATTERN,
} from '../src/test/vendor_api/manifest';
import { createSpecCache } from '../src/test/vendor_api/spec/spec_cache';
import { surfaceDrift } from '../src/test/vendor_api/drift/surface_drift';
import { updateVendorApi } from '../src/test/vendor_api/record/update_vendor_api';

const SPEC_CACHE = path.join(REPO_ROOT, 'data', 'connector_vendor_api');
const DRIFT_REPORT = path.join(REPO_ROOT, 'target', 'connector_vendor_api', 'drift.json');
const COVERAGE_REPORT = path.join(REPO_ROOT, 'target', 'connector_vendor_api', 'coverage.ndjson');
const COVERAGE_JSON_REPORT = path.join(
  REPO_ROOT,
  'target',
  'connector_vendor_api',
  'coverage.json'
);
const DRIFT_SUMMARY = path.join(REPO_ROOT, 'target', 'connector_vendor_api', 'drift_summary.json');
// A vendor that doesn't answer fails its own fetch, not the whole run.
const FETCH_TIMEOUT_MS = 120_000;

const parseNamed = (option: string, flag: string, value: string): [string, string] => {
  const separator = flag.indexOf('=');
  if (separator < 1) {
    throw createFlagError(`--${option} must look like name=${value}, got "${flag}"`);
  }
  const name = flag.slice(0, separator);
  if (!SOURCE_NAME_PATTERN.test(name)) {
    throw createFlagError(
      `--${option} source names are lowercase snake_case, such as v2 or users_v1, since the snapshot file takes the name; got "${name}"`
    );
  }
  return [name, flag.slice(separator + 1)];
};

const parseFormat = (flag: string): [string, MarkdownSourceFormat | ProtocolFormat] => {
  const [name, format] = parseNamed('format', flag, 'format');
  const options = [...markdownSourceFormatSchema.options, ...protocolSourceFormatSchema.options];
  const parsed = markdownSourceFormatSchema.or(protocolSourceFormatSchema).safeParse(format);
  if (!parsed.success) {
    throw createFlagError(`--format takes ${options.join(', ')}, got "${format}"`);
  }
  return [name, parsed.data];
};

// Repeated `--pages name=prefix`, `--endpoint name=url` and `--tool name=url` flags add up to one
// list per source.
const groupByName = (option: string, value: string, flags: readonly string[]) => {
  const groups: Record<string, string[]> = {};
  for (const flag of flags) {
    const [name, item] = parseNamed(option, flag, value);
    groups[name] = [...(groups[name] ?? []), item];
  }
  return groups;
};

const writeJson = async (file: string, value: unknown): Promise<void> => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
};

const fetchText = async (url: string): Promise<string> => {
  const deadline = timeoutSignal(FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: deadline });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return response.text();
  } finally {
    deadline.dispose();
  }
};

run(
  async ({ log, flagsReader }) => {
    const check = flagsReader.boolean('check');
    const refresh = flagsReader.boolean('refresh');
    const sources = Object.fromEntries(
      (flagsReader.arrayOfStrings('source') ?? []).map((flag) => parseNamed('source', flag, 'url'))
    );
    const formats = Object.fromEntries(
      (flagsReader.arrayOfStrings('format') ?? []).map(parseFormat)
    );
    const pages = groupByName('pages', 'prefix', flagsReader.arrayOfStrings('pages') ?? []);
    const endpoints = groupByName('endpoint', 'url', flagsReader.arrayOfStrings('endpoint') ?? []);
    const tools = groupByName('tool', 'url', flagsReader.arrayOfStrings('tool') ?? []);
    const captureFiles = Object.fromEntries(
      (flagsReader.arrayOfStrings('capture') ?? []).map((flag) =>
        parseNamed('capture', flag, 'file')
      )
    );
    const notes = Object.fromEntries(
      (flagsReader.arrayOfStrings('note') ?? []).map((flag) => parseNamed('note', flag, 'text'))
    );
    const captureFlagsGiven = Object.keys(captureFiles).length + Object.keys(notes).length > 0;
    const now = () => new Date();
    const cache = createSpecCache({ directory: SPEC_CACHE, fetchText, refresh, now, log });

    if (flagsReader.boolean('json') && !flagsReader.boolean('coverage')) {
      throw createFlagError('--json only applies to --coverage');
    }

    if (flagsReader.boolean('coverage')) {
      if (check || refresh || flagsReader.boolean('inspect') || flagsReader.boolean('drift')) {
        throw createFlagError(
          '--coverage reads the committed artifacts and writes only the report'
        );
      }
      const asJson = flagsReader.boolean('json');
      const documents = await collectCoverage(REPO_ROOT);
      const reportPath = path.resolve(
        flagsReader.string('report') ?? (asJson ? COVERAGE_JSON_REPORT : COVERAGE_REPORT)
      );
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, serializeCoverage(documents, { asJson }));
      log.success(`Wrote the coverage of ${documents.length} connector(s) to ${reportPath}`);
      return;
    }

    if (flagsReader.boolean('surface')) {
      const reportPath = path.resolve(flagsReader.string('report') ?? DRIFT_REPORT);
      const report: DriftReportEntry[] = JSON.parse(await fs.readFile(reportPath, 'utf8'));
      const repo = flagsReader.requiredString('github-repo');
      const connectors = await listConnectors();
      const directories = new Map(
        connectors.map(({ connector, directory }) => [connector.metadata.id, directory])
      );
      const codeOwners = getCodeOwnersEntries();
      const summary = await surfaceDrift({
        report,
        tracker: createGhIssueTracker(repo),
        repo,
        dryRun: flagsReader.boolean('dry-run'),
        ownersOf: (connector) => {
          const directory = directories.get(connector);
          // A path inside the connector's folder: `specs/<connector>/**` doesn't match the folder.
          return directory ? getOwningTeamsForPath(directory, codeOwners) : [];
        },
        knownConnectors: new Set(
          connectors
            .filter(({ directory }) => existsSync(path.join(directory, 'manifest.json')))
            .map(({ connector }) => connector.metadata.id)
        ),
        buildUrl: process.env.BUILDKITE_BUILD_URL,
        log,
      });
      const summaryPath = path.resolve(flagsReader.string('summary') ?? DRIFT_SUMMARY);
      await writeJson(summaryPath, summary);
      log.success(`Wrote the drift summary to ${summaryPath}`);
      const failed = summary.actions.filter(({ action }) => action === 'failed');
      if (failed.length > 0) {
        throw createFailError(
          `${failed.length} connector(s) failed:\n${failed
            .map(({ connector, error }) => `  - ${connector}: ${error}`)
            .join('\n')}`
        );
      }
      return;
    }

    if (flagsReader.boolean('drift')) {
      const sourceFlagsGiven = [sources, formats, pages, endpoints, tools].some(
        (flags) => Object.keys(flags).length > 0
      );
      if (
        check ||
        refresh ||
        flagsReader.boolean('inspect') ||
        sourceFlagsGiven ||
        captureFlagsGiven
      ) {
        throw createFlagError(
          '--drift always fetches the latest specs of the manifest sources and writes no artifacts'
        );
      }
      const driftedId = flagsReader.string('connector');
      const connectors = driftedId
        ? [await findConnector(driftedId)]
        : (await listConnectors()).filter(({ directory }) =>
            existsSync(path.join(directory, 'manifest.json'))
          );
      const report: DriftReportEntry[] = [];
      for (const { connector, directory } of connectors) {
        try {
          // Uncached, so the vendor's latest spec is compared.
          const drift = await detectDrift({
            connector,
            directory,
            fetchText,
            now,
            log,
            // The connector's folder, for links in its issue
            folder: path.relative(REPO_ROOT, path.dirname(directory)),
          });
          log.info(`${drift.connector}: ${drift.outcome} (${drift.verdict})`);
          report.push(drift);
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          log.error(`${connector.metadata.id}: ${reason}`);
          report.push({ connector: connector.metadata.id, error: reason });
        }
      }
      const reportPath = path.resolve(flagsReader.string('report') ?? DRIFT_REPORT);
      await writeJson(reportPath, report);
      log.success(`Wrote the drift report of ${report.length} connector(s) to ${reportPath}`);
      return;
    }

    if (flagsReader.boolean('inspect')) {
      if (check) {
        throw createFlagError('--inspect checks nothing; leave out --check');
      }
      if (captureFlagsGiven) {
        throw createFlagError(
          '--inspect skips captured sources and writes no snapshots; record with --capture and --note instead'
        );
      }
      const inspectedId = flagsReader.string('connector');
      const directory = inspectedId ? await findVendorApiDirectory(inspectedId) : undefined;
      const { output, manifestUpdated, problems } = await inspectVendorApi({
        sources,
        formats,
        pages,
        directory,
        operations: flagsReader.arrayOfStrings('operation') ?? [],
        grep: flagsReader.string('grep'),
        depth: flagsReader.number('depth'),
        fetchText: cache.fetchText,
        fetchedAt: cache.fetchedAt,
        now,
        log,
      });
      log.write(output);
      if (directory && manifestUpdated) {
        log.info(
          `Added the sources to ${path.relative(REPO_ROOT, path.join(directory, 'manifest.json'))}`
        );
      }
      if (problems.length > 0) {
        throw createFailError(problems.join('\n'));
      }
      return;
    }

    const id = flagsReader.requiredString('connector');
    if (check && captureFlagsGiven) {
      throw createFlagError('--check writes nothing, so it takes no --capture or --note');
    }
    const captures = Object.fromEntries(
      await Promise.all(
        Object.entries(captureFiles).map(async ([name, file]) => {
          try {
            return [name, await fs.readFile(path.resolve(file), 'utf8')] as const;
          } catch (error) {
            throw createFlagError(
              `--capture ${name}=${file}: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        })
      )
    );
    const { connector, directory } = await findConnector(id);
    if (Object.keys(sources).length === 0 && !existsSync(path.join(directory, 'manifest.json'))) {
      throw createFlagError(
        `${id} has no vendor_api/manifest.json yet; pass its specs with --source`
      );
    }
    const { changed, problems } = await updateVendorApi({
      connector,
      directory,
      sources,
      formats,
      pages,
      endpoints,
      tools,
      captures,
      notes,
      refresh,
      check,
      fetchText: cache.fetchText,
      fetchedAt: cache.fetchedAt,
      now,
      log,
    });

    for (const file of changed) {
      const relative = path.relative(REPO_ROOT, path.join(directory, file));
      log.info(`${check ? 'Out of date' : 'Updated'}: ${relative}`);
    }
    if (problems.length > 0) {
      throw createFailError(
        `${problems.length} problem(s) recording ${id}:\n${problems
          .map((p) => `  - ${p}`)
          .join('\n')}`
      );
    }
    if (check && changed.length > 0) {
      throw createFailError(
        `Vendor API artifacts of ${id} are out of date; run node scripts/connector_vendor_api --connector ${id}`
      );
    }
    if (changed.length === 0) {
      log.success(`Vendor API artifacts of ${id} are up to date`);
    }
  },
  {
    description: `Records which vendor API operations a connector calls and writes its vendor_api artifacts.

      Without --source or --refresh, records offline against the committed snapshots.
      With --inspect, shows what the vendor specs offer instead, before or while writing the connector.
      With --drift, compares the committed artifacts with the vendor's latest specs and reports
      what changed, without writing them. With --surface, files or updates a GitHub issue per
      connector of that report that needs one, and closes those of connectors healthy again.
      With --coverage, writes one JSON document per connector (API type, emulator and drift
      coverage) as NDJSON, or as one JSON array with --json, from the committed artifacts.

      Fetched specs are kept in data/connector_vendor_api, so a spec inspected before writing a
      connector is the one it is recorded against. --refresh fetches them again.`,
    flags: {
      string: [
        'connector',
        'source',
        'format',
        'pages',
        'endpoint',
        'tool',
        'capture',
        'note',
        'operation',
        'grep',
        'depth',
        'report',
        'github-repo',
        'summary',
      ],
      boolean: ['refresh', 'check', 'inspect', 'drift', 'surface', 'coverage', 'json', 'dry-run'],
      help: `
        --connector  Connector metadata.id, for example datadog or .datadog (required unless --inspect,
                     --drift, --surface or --coverage)
        --source     name=url of a vendor spec to add or move; repeatable. Loads every source.
        --format     name=format of a source that is a Markdown API reference, whose url is its
                     llms.txt index: databricks-markdown or brave-markdown. Or graphql, whose url
                     serves SDL or an introspection result, or mcp, whose url serves a tools/list
                     result. Kept in manifest.json.
        --endpoint   name=url the connector calls for a graphql or mcp source; repeatable. Kept in
                     manifest.json.
        --pages      name=prefix of the reference pages to fetch, absolute or relative to the
                     index, such as an API group's folder; repeatable. Kept in manifest.json.
        --tool       name=url of one tool document of an mcp source, absolute or relative to its
                     url, for a vendor that publishes a document per tool rather than a tools/list
                     result; repeatable. Kept in manifest.json.
        --capture    name=file of a document the source's url only serves with credentials, fetched
                     by hand. Records against it, replaces the source's snapshot and marks the
                     source captured, so it is never fetched; needs a note
        --note       name=text of the source's note in manifest.json, such as what capturing it took
        --refresh    Fetch every source URL again, instead of using the specs fetched before
        --check     Write nothing; fail if artifacts would change or problems are found
        --inspect    List the operations of the --source specs, or of the connector's manifest
                     sources, with its overlay applied. With --connector, adds new --source specs
                     to its manifest.json, so recording needs no --source
        --operation  With --inspect, describe this operation instead: "METHOD /path" or an
                     operationId; repeatable
        --grep       With --inspect, list only operations matching this case-insensitive pattern
        --depth      With --inspect, how many $refs deep to inline schemas (default 4)
        --drift      Compare the artifacts of --connector, or of every connector with a manifest,
                     with the latest vendor specs: changes classified with oasdiff (OASDIFF_BIN or
                     oasdiff on the PATH), actions recorded against both, and whether that needs
                     a refresh or an issue. Writes nothing but the report
        --report     With --drift, where to write the JSON report; with --surface, where to read it
                     (default target/connector_vendor_api/drift.json). With --coverage, where to
                     write it (default target/connector_vendor_api/coverage.ndjson, or coverage.json
                     with --json)
        --surface    Turn the --report into GitHub issues in --github-repo, with gh and its
                     GITHUB_TOKEN, and write a summary listing the connectors to refresh
        --github-repo  With --surface, the repository of the issues, for example elastic/kibana
        --coverage   Write one document per connector with its direction, API type, emulator and
                     drift coverage, read from the committed artifacts; needs no network
        --json       With --coverage, write all the documents as one JSON array instead of one
                     document per line (NDJSON)
        --dry-run    With --surface, read the issues but only log what would be written
        --summary    With --surface, where to write the summary
                     (default target/connector_vendor_api/drift_summary.json)
      `,
    },
  }
);
