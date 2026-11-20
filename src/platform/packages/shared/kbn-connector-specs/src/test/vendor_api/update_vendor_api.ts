/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';
import path from 'path';
import type {
  GraphQLSpec,
  McpSpec,
  OpenApiDocument,
  OverlayDocument,
} from '@kbn/connector-emulate';
import type { ConnectorSpec } from '../../connector_spec';
import { forEachRef } from './json_pointer';
import { loadVendorSpec } from './load_vendor_spec';
import type { VendorApiFixtures } from './fixtures';
import { vendorApiFixturesSchema } from './fixtures';
import type {
  ManifestCall,
  ManifestOperation,
  ManifestPagination,
  ManifestSource,
  MarkdownSourceFormat,
  ProtocolFormat,
  UnmatchedRequest,
  VendorApiManifest,
} from './manifest';
import {
  isMarkdownFormat,
  isNamedCall,
  isProtocolFormat,
  matchesPathTemplate,
  parseManifest,
  serializeManifest,
} from './manifest';
import type { VendorApiLog } from './load_vendor_specs';
import {
  applyOverlayWithFindings,
  FIXTURES,
  MANIFEST,
  OVERLAY,
  readOptional,
  snapshotFile,
} from './load_vendor_specs';
import { parseSpecText } from './parse_spec_text';
import { loadProtocolSpec, parseProtocolSnapshot, projectProtocolSpec } from './protocol_sources';
import { projectSpec } from './project_spec';
import { assessPagination } from './propose_pagination';
import type { DriftProblem } from './drift_problem';
import { otherProblem, problemTextOf } from './drift_problem';
import type { ActionsRecording, RecordingFinding } from './record_actions';
import { recordActions } from './record_actions';
import { toStableJson } from './stable_json';

export type { VendorApiLog } from './load_vendor_specs';

export interface UpdateVendorApiOptions {
  readonly connector: ConnectorSpec;
  /** The connector's `vendor_api` folder. */
  readonly directory: string;
  /** Sources to add or point elsewhere, by name; the manifest's are kept otherwise. */
  readonly sources?: Readonly<Record<string, string>>;
  /** Sources that are Markdown references, GraphQL or MCP, by name. */
  readonly formats?: Readonly<Record<string, MarkdownSourceFormat | ProtocolFormat>>;
  /** Per GraphQL or MCP source, the URLs the connector calls; see `ManifestSource`. */
  readonly endpoints?: Readonly<Record<string, readonly string[]>>;
  /** Per Markdown reference, the URL prefixes of the pages to fetch; see `ManifestSource`. */
  readonly pages?: Readonly<Record<string, readonly string[]>>;
  /**
   * Fetches the full vendor specs. Without it, actions are recorded against the committed
   * snapshots, which only picks up changes on the connector's side.
   */
  readonly refresh?: boolean;
  /** Reports what would change instead of writing it. */
  readonly check?: boolean;
  /** Records which response fields each action reads, copies and returns. */
  readonly trackFields?: boolean;
  readonly fetchText: (url: string) => Promise<string>;
  /** When the document `fetchText` returned for a URL was fetched, if not just now. */
  readonly fetchedAt?: (url: string) => Date | undefined;
  readonly now: () => Date;
  readonly log: VendorApiLog;
}

export interface UpdateVendorApiResult {
  /** Files that were written, or with `check`, would be. */
  readonly changed: readonly string[];
  /** What makes the artifacts untrustworthy; the script fails when there are any. */
  readonly problems: readonly string[];
  /** The `problems` of each action, without the action's name in front. */
  readonly problemsByAction: Readonly<Record<string, readonly string[]>>;
  /** The `problems` that concern no single action, e.g. a missing pagination declaration. */
  readonly otherProblems: readonly DriftProblem[];
  /** The specs the actions were recorded against, by source, without the overlay. */
  readonly specs: Readonly<Record<string, OpenApiDocument>>;
  /**
   * The zero-based indexes of the overlay actions that match nothing in any source; only
   * assessed when every source was fetched, as a snapshot lacks what the connector doesn't call.
   */
  readonly staleOverlayActions: readonly number[];
  /** With `trackFields`, as `recordActions` reports them. */
  readonly fieldUse?: ActionsRecording['fieldUse'];
  readonly untracked?: ActionsRecording['untracked'];
}

const listSnapshots = async (directory: string): Promise<string[]> => {
  try {
    return (await fs.readdir(path.join(directory, 'snapshots'))).map((file) =>
      path.join('snapshots', file)
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};

/** The action a finding is about, when it is about one. */
const actionOf = (finding: RecordingFinding): string | undefined =>
  'action' in finding ? finding.action : undefined;

/**
 * What a finding says, without naming the action it is about: {@link actionOf} has that, and
 * `problemText` puts the two together for the list the script prints.
 */
const describeFinding = (finding: RecordingFinding): string => {
  switch (finding.kind) {
    case 'no-input':
      return `no generated input passes the action's schema; add an input to ${FIXTURES}`;
    case 'handler-error':
      return `the handler threw: ${finding.message}`;
    case 'no-auth-type':
      return `threw before sending a request under every auth type: ${Object.entries(finding.errors)
        .map(([authType, message]) => `${authType}: ${message}`)
        .join('; ')}`;
    case 'auth-type-error':
      return `auth type ${finding.authType} can't be used against the contract mock, so no action was recorded with it: ${finding.message}`;
    case 'request-violation':
      return `${finding.request} breaks the spec: ${finding.violations
        .map(({ message }) => message)
        .join('; ')}`;
    case 'insufficient-scope':
      return `under auth type ${finding.authType}, ${
        finding.operation
      } needs OAuth scopes the auth type doesn't request: ${finding.violations
        .map(({ message }) => message)
        .join(
          '; '
        )}; add one to the auth type's default "scope", or correct the spec's scopes in ${OVERLAY}`;
    case 'read-scope':
      return `has scope 'read' but sent ${finding.request}; if the operation only queries, add it to the action's "queries" in ${FIXTURES}, otherwise correct the scope`;
    case 'unused-query':
      return `lists ${finding.operation} in "queries" in ${FIXTURES}, but no request of a 'read' scoped run needed it; remove it`;
    case 'rejected-response':
      return `the response override for ${finding.operation} breaks the spec: ${finding.violations
        .map(({ message }) => message)
        .join('; ')}`;
    case 'loose-input': {
      const { input, operation, parameter, gap } = finding.loose;
      return `input "${input}" accepts more than ${operation} allows for its ${parameter}, which declares ${gap.keyword} ${gap.vendor} where the input declares ${gap.connector}; tighten the input, or record why it is looser under "looseInputs" in ${FIXTURES}`;
    }
  }
};

/** A finding as the script lists it: the action it is about, then what it says. */
const problemText = (finding: RecordingFinding): string => {
  const action = actionOf(finding);
  const described = describeFinding(finding);
  return action === undefined ? described : `${action}: ${described}`;
};

const isProblem = ({ kind }: RecordingFinding): boolean =>
  kind === 'no-auth-type' ||
  kind === 'auth-type-error' ||
  kind === 'request-violation' ||
  kind === 'insufficient-scope' ||
  kind === 'read-scope' ||
  kind === 'unused-query' ||
  kind === 'rejected-response' ||
  kind === 'loose-input';

/**
 * Regenerates a connector's `vendor_api` artifacts: records its actions against the vendor
 * specs (the full ones with `refresh`, the committed snapshots otherwise), then writes the
 * manifest and the snapshots projected from the raw specs, without the overlay.
 */
export const updateVendorApi = async ({
  connector,
  directory,
  sources: sourceFlags = {},
  formats: formatFlags = {},
  pages: pageFlags = {},
  endpoints: endpointFlags = {},
  refresh = false,
  check = false,
  trackFields = false,
  fetchText,
  fetchedAt: fetchedAtOf,
  now,
  log,
}: UpdateVendorApiOptions): Promise<UpdateVendorApiResult> => {
  const read = (file: string) => readOptional(path.join(directory, file));
  const manifestText = await read(MANIFEST);
  const previous: VendorApiManifest | undefined = manifestText
    ? parseManifest(manifestText)
    : undefined;
  const fixturesText = await read(FIXTURES);
  const fixtures: VendorApiFixtures = fixturesText
    ? vendorApiFixturesSchema.parse(JSON.parse(fixturesText))
    : {};
  const overlayText = await read(OVERLAY);
  const overlay = overlayText ? (parseSpecText(overlayText) as OverlayDocument) : undefined;

  const urls: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(previous?.sources ?? {}).map(([name, { url }]) => [name, url])
    ),
    ...sourceFlags,
  };
  if (Object.keys(urls).length === 0) {
    throw new Error(
      `${connector.metadata.id} has no ${MANIFEST} yet; pass its sources with --source`
    );
  }
  // Naming a source, or how to read one, means fetching it again.
  const fetchAll =
    refresh ||
    [sourceFlags, formatFlags, pageFlags, endpointFlags].some(
      (flags) => Object.keys(flags).length > 0
    );

  for (const name of [
    ...Object.keys(formatFlags),
    ...Object.keys(pageFlags),
    ...Object.keys(endpointFlags),
  ]) {
    if (!(name in urls)) {
      throw new Error(
        `--format, --pages and --endpoint name a source, but there is no source "${name}"`
      );
    }
  }
  const markdownFormatOf = (name: string): MarkdownSourceFormat | undefined => {
    const format = formatFlags[name] ?? previous?.sources[name]?.format;
    return isMarkdownFormat(format) ? format : undefined;
  };
  const pagesOf = (name: string): readonly string[] | undefined =>
    pageFlags[name] ?? previous?.sources[name]?.pages;

  const raw: Record<string, OpenApiDocument> = {};
  const protocols: Record<string, GraphQLSpec | McpSpec> = {};
  const formats: Record<string, ManifestSource['format']> = {};
  // The `info.version` of each source loaded in full, rather than read from its snapshot.
  const loaded = new Map<string, string | undefined>();
  for (const [name, url] of Object.entries(urls)) {
    const known = previous?.sources[name];
    const declaredFormat = formatFlags[name] ?? known?.format;
    const endpoints = endpointFlags[name] ?? known?.endpoints;
    if (isProtocolFormat(declaredFormat)) {
      if (endpoints === undefined) {
        throw new Error(`${name}: a ${declaredFormat} source needs --endpoint`);
      }
      formats[name] = declaredFormat;
      const snapshot = fetchAll ? undefined : await read(snapshotFile(name, declaredFormat));
      if (snapshot === undefined) {
        log.info(`Loading ${name} from ${url}`);
        protocols[name] = await loadProtocolSpec(url, fetchText, declaredFormat, endpoints);
        loaded.set(name, undefined);
      } else {
        protocols[name] = parseProtocolSnapshot(declaredFormat, snapshot, endpoints);
      }
      continue;
    }
    if (endpointFlags[name] !== undefined) {
      throw new Error(`${name}: --endpoint only applies to GraphQL and MCP sources; pass --format`);
    }
    const snapshot = fetchAll ? undefined : await read(snapshotFile(name, declaredFormat));
    if (snapshot === undefined) {
      const markdownFormat = markdownFormatOf(name);
      const pages = pagesOf(name);
      if (!markdownFormat && pages !== undefined) {
        throw new Error(`${name}: --pages only applies to Markdown references; pass --format`);
      }
      log.info(`Loading ${name} from ${url}`);
      const { format, apiVersion, document } = await loadVendorSpec(url, fetchText, {
        format: markdownFormat,
        pages,
      });
      formats[name] = format;
      raw[name] = document;
      loaded.set(name, apiVersion);
    } else {
      raw[name] = JSON.parse(snapshot);
      formats[name] = previous?.sources[name]?.format ?? 'openapi';
    }
  }

  // Protocol sources are loaded apart from `raw`, so every source is counted through `urls`.
  const fetchedEverySource = loaded.size === Object.keys(urls).length;
  const { specs, unmatchedActions } = applyOverlayWithFindings(raw, overlay);
  // A snapshot only has the operations the connector calls, so an overlay action matching
  // nothing there may still be needed.
  const staleOverlayActions = fetchedEverySource ? unmatchedActions : [];
  for (const index of staleOverlayActions) {
    log.warning(
      `${OVERLAY} action ${index} matches nothing in any source; the vendor may have fixed it`
    );
  }

  log.info(
    `Recording ${Object.keys(connector.actions).length} actions of ${connector.metadata.id}`
  );
  // A path several sources describe stays on the source it was recorded from, so the latest
  // specs adding it to another source doesn't move the actions there. Named operations, which
  // GraphQL and MCP sources record, are matched by name rather than by path.
  const preferredOperations = Object.values(previous?.operations ?? {})
    .flat()
    .filter((call): call is ManifestOperation => !isNamedCall(call));
  const recording = await recordActions({
    connector,
    specs: { ...specs, ...protocols },
    fixtures,
    trackFields,
    preferredOperations,
    invalidSchemas: 'skip',
  });
  // Each generated input reports its own findings, which are often the same.
  const problems = new Set<string>();
  const problemsByAction = new Map<string, Set<string>>();
  const otherProblems = new Map<string, DriftProblem>();
  // The list the script prints names the action a problem is about; `problemsByAction` keys by it.
  // A problem about no action keeps its parts, so an issue can table it; `addOtherProblem` takes
  // the parts, and `addProblem` the text of one that has none of its own.
  const addOtherProblem = (problem: DriftProblem, text = problemTextOf(problem)) => {
    problems.add(text);
    otherProblems.set(text, problem);
  };
  const addProblem = (text: string, action?: string) => {
    if (action === undefined) {
      addOtherProblem(otherProblem(text), text);
      return;
    }
    problems.add(`${action}: ${text}`);
    const own = problemsByAction.get(action) ?? new Set<string>();
    own.add(text);
    problemsByAction.set(action, own);
  };
  const warnings = new Set<string>();
  for (const finding of recording.findings) {
    if (isProblem(finding)) {
      addProblem(describeFinding(finding), actionOf(finding));
    } else {
      warnings.add(problemText(finding));
    }
  }

  const operationKey = ({ source, method, path: operationPath }: ManifestOperation) =>
    `${method.toUpperCase()} ${operationPath} (${source})`;
  // Assessed operations too, so each is proposed or reported once across actions.
  const declared = new Map<string, ManifestPagination | undefined>(
    Object.values(previous?.operations ?? {})
      .flat()
      .flatMap((call) => {
        if (isNamedCall(call) || !call.pagination) {
          return [];
        }
        const { pagination, ...entry } = call;
        return [[operationKey(entry), pagination] as const];
      })
  );
  const paginationOf = (operation: ManifestOperation): ManifestPagination | undefined => {
    const key = operationKey(operation);
    if (declared.has(key)) {
      return declared.get(key);
    }
    const assessment = assessPagination(specs[operation.source], operation);
    const proposed = assessment.listLike ? assessment.proposal : undefined;
    if (assessment.listLike && proposed) {
      warnings.add(
        `${key}: proposed "pagination" from ${proposed.basis} in ${MANIFEST}; review it`
      );
    } else if (assessment.listLike) {
      const { source, method, path: operationPath } = operation;
      addOtherProblem({
        kind: 'undeclared-pagination',
        operation: `${method.toUpperCase()} ${operationPath}`,
        source,
        reason: assessment.reason,
      });
    }
    declared.set(key, proposed?.pagination);
    return proposed?.pagination;
  };
  const operations = Object.fromEntries(
    Object.entries(recording.operations).map(([action, entries]) => [
      action,
      entries.map((entry): ManifestCall => {
        if (isNamedCall(entry)) {
          return entry;
        }
        const pagination = paginationOf(entry);
        return pagination ? { ...entry, pagination } : entry;
      }),
    ])
  );
  for (const { operation, location, message } of recording.invalidOperations) {
    warnings.add(
      `${operation} is left out of the mock, as its schema in the spec is invalid (${location}): ${message}`
    );
  }
  warnings.forEach((warning) => log.warning(warning));

  // Operations the mock left out for their broken schemas, which their requests match instead.
  const brokenOperationOf = (method: string, requestPath: string) =>
    recording.invalidOperations.find(({ operation }) => {
      const [brokenMethod, template] = operation.split(' ');
      return (
        brokenMethod.toLowerCase() === method.toLowerCase() &&
        matchesPathTemplate(template, requestPath)
      );
    });
  const unmatched: Record<string, UnmatchedRequest[]> = {};
  for (const [action, requests] of Object.entries(recording.unmatched)) {
    for (const { method, path: requestPath } of requests) {
      const acknowledged = previous?.unmatched?.[action]?.find(
        (entry) => entry.method === method && matchesPathTemplate(entry.path, requestPath)
      );
      if (acknowledged) {
        if (!unmatched[action]?.includes(acknowledged)) {
          unmatched[action] = [...(unmatched[action] ?? []), acknowledged];
        }
        continue;
      }
      const broken = brokenOperationOf(method, requestPath);
      if (broken) {
        addProblem(
          `calls ${broken.operation}, whose schema in the spec is invalid (${broken.location}): ${broken.message}; correct the spec in ${OVERLAY}`,
          action
        );
      } else {
        const refreshHint = fetchAll ? '' : '; if it is new to the connector, rerun with --refresh';
        addProblem(
          `${method.toUpperCase()} ${requestPath} matches no operation of any source; correct the spec in ${OVERLAY}, or add it to "unmatched" in ${MANIFEST} with a reason${refreshHint}`,
          action
        );
      }
    }
  }

  // Offline runs apply the overlay to the snapshots, so they keep what its updates reference.
  const overlayRefs: string[] = [];
  overlay?.actions.forEach(({ update }) => forEachRef(update, (ref) => overlayRefs.push(ref)));
  const files: Record<string, string> = {};
  const sources: Record<string, ManifestSource> = {};
  for (const name of Object.keys(urls)) {
    const used = Object.values(recording.operations)
      .flat()
      .filter(({ source }) => source === name);
    const file = snapshotFile(name, formats[name]);
    files[file] =
      name in protocols
        ? projectProtocolSpec(
            protocols[name],
            [
              ...used.filter(isNamedCall).map((call) => call.name),
              ...(recording.namedRootFields[name] ?? []),
            ],
            recording.namedTypes[name]
          )
        : toStableJson(
            projectSpec(
              raw[name],
              used.flatMap((call) => (isNamedCall(call) ? [] : [call])),
              overlayRefs
            )
          );
    const unchanged = (await read(file)) === files[file];
    const apiVersion = loaded.has(name) ? loaded.get(name) : previous?.sources[name]?.apiVersion;
    const pages = isMarkdownFormat(formats[name]) ? pagesOf(name) : undefined;
    const fetchedAt = unchanged
      ? previous?.sources[name]?.fetchedAt
      : (fetchedAtOf?.(urls[name]) ?? now()).toISOString();
    const note = previous?.sources[name]?.note;
    const endpoints = endpointFlags[name] ?? previous?.sources[name]?.endpoints;
    sources[name] = {
      format: formats[name],
      url: urls[name],
      ...(name in protocols && endpoints ? { endpoints: [...endpoints] } : {}),
      ...(pages === undefined ? {} : { pages: [...pages] }),
      ...(apiVersion === undefined ? {} : { apiVersion }),
      fetchedAt: fetchedAt ?? now().toISOString(),
      ...(note === undefined ? {} : { note }),
    };
  }
  files[MANIFEST] = serializeManifest({
    sources,
    operations,
    ...(Object.keys(unmatched).length === 0 ? {} : { unmatched }),
  });

  const changed: string[] = [];
  for (const [file, contents] of Object.entries(files)) {
    if ((await read(file)) !== contents) {
      changed.push(file);
      if (!check) {
        await fs.mkdir(path.dirname(path.join(directory, file)), { recursive: true });
        await fs.writeFile(path.join(directory, file), contents);
      }
    }
  }
  for (const file of await listSnapshots(directory)) {
    if (!(file in files)) {
      changed.push(file);
      if (!check) {
        await fs.rm(path.join(directory, file));
      }
    }
  }
  return {
    changed,
    problems: [...problems],
    problemsByAction: Object.fromEntries(
      [...problemsByAction].map(([action, own]) => [action, [...own]])
    ),
    otherProblems: [...otherProblems.values()],
    specs: raw,
    staleOverlayActions,
    ...(recording.fieldUse ? { fieldUse: recording.fieldUse } : {}),
    ...(recording.untracked ? { untracked: recording.untracked } : {}),
  };
};
