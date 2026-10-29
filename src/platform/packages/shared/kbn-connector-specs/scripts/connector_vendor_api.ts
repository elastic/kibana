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
import { getCodeOwnersEntries, getOwningTeamsForPath } from '@kbn/code-owners';
import type { DriftReportEntry } from '../src/test/vendor_api/detect_drift';
import { detectDrift } from '../src/test/vendor_api/detect_drift';
import { findConnector, listConnectors } from '../src/test/vendor_api/find_connector';
import { createGhIssueTracker } from '../src/test/vendor_api/gh_issue_tracker';
import { inspectVendorApi } from '../src/test/vendor_api/inspect_vendor_api';
import { createSpecCache } from '../src/test/vendor_api/spec_cache';
import { surfaceDrift } from '../src/test/vendor_api/surface_drift';
import { updateVendorApi } from '../src/test/vendor_api/update_vendor_api';

const SPEC_CACHE = path.join(REPO_ROOT, 'data', 'connector_vendor_api');
const DRIFT_REPORT = path.join(REPO_ROOT, 'target', 'connector_vendor_api', 'drift.json');
const DRIFT_SUMMARY = path.join(REPO_ROOT, 'target', 'connector_vendor_api', 'drift_summary.json');
// A vendor that doesn't answer fails its own fetch, not the whole run.
const FETCH_TIMEOUT_MS = 120_000;

const parseSource = (flag: string): [string, string] => {
  const separator = flag.indexOf('=');
  if (separator < 1) {
    throw createFlagError(`--source must look like name=url, got "${flag}"`);
  }
  return [flag.slice(0, separator), flag.slice(separator + 1)];
};

const writeJson = async (file: string, value: unknown): Promise<void> => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
};

const fetchText = async (url: string): Promise<string> => {
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.text();
};

run(
  async ({ log, flagsReader }) => {
    const check = flagsReader.boolean('check');
    const refresh = flagsReader.boolean('refresh');
    const sources = Object.fromEntries(
      (flagsReader.arrayOfStrings('source') ?? []).map(parseSource)
    );
    const now = () => new Date();
    const cache = createSpecCache({ directory: SPEC_CACHE, fetchText, refresh, now, log });

    if (flagsReader.boolean('surface')) {
      const reportPath = path.resolve(flagsReader.string('report') ?? DRIFT_REPORT);
      const report: DriftReportEntry[] = JSON.parse(await fs.readFile(reportPath, 'utf8'));
      const repo = flagsReader.requiredString('github-repo');
      const directories = new Map(
        (await listConnectors()).map(({ connector, directory }) => [
          connector.metadata.id,
          directory,
        ])
      );
      const codeOwners = getCodeOwnersEntries();
      const summary = await surfaceDrift({
        report,
        tracker: createGhIssueTracker(repo),
        repo,
        dryRun: flagsReader.boolean('dry-run'),
        ownersOf: (connector) => {
          const directory = directories.get(connector);
          return directory ? getOwningTeamsForPath(path.dirname(directory), codeOwners) : [];
        },
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
      if (check || refresh || flagsReader.boolean('inspect') || Object.keys(sources).length > 0) {
        throw createFlagError('--drift always fetches the latest specs and writes no artifacts');
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
          const drift = await detectDrift({ connector, directory, fetchText, now, log });
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
      const inspectedId = flagsReader.string('connector');
      const directory = inspectedId ? (await findConnector(inspectedId)).directory : undefined;
      const { output, manifestUpdated, problems } = await inspectVendorApi({
        sources,
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

      Fetched specs are kept in data/connector_vendor_api, so a spec inspected before writing a
      connector is the one it is recorded against. --refresh fetches them again.`,
    flags: {
      string: [
        'connector',
        'source',
        'operation',
        'grep',
        'depth',
        'report',
        'github-repo',
        'summary',
      ],
      boolean: ['refresh', 'check', 'inspect', 'drift', 'surface', 'dry-run'],
      help: `
        --connector  Connector metadata.id, for example datadog or .datadog (required unless --inspect
                     or --drift)
        --source     name=url of a vendor spec to add or move; repeatable. Loads every source.
        --refresh    Fetch every source URL again, instead of using the specs fetched before
        --check      Write nothing; fail if artifacts would change or problems are found
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
                     (default target/connector_vendor_api/drift.json)
        --surface    Turn the --report into GitHub issues in --github-repo, with gh and its
                     GITHUB_TOKEN, and write a summary listing the connectors to refresh
        --github-repo  With --surface, the repository of the issues, for example elastic/kibana
        --dry-run    With --surface, read the issues but only log what would be written
        --summary    With --surface, where to write the summary
                     (default target/connector_vendor_api/drift_summary.json)
      `,
    },
  }
);
