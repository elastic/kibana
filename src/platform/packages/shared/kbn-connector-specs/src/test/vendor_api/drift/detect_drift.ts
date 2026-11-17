/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import type { OpenApiDocument, OverlayDocument } from '@kbn/connector-emulate';
import type { ConnectorSpec } from '../../../connector_spec';
import { loadVendorSpec } from '../spec/load_vendor_spec';
import { MANIFEST, OVERLAY, readOptional, snapshotFile } from '../spec/load_vendor_specs';
import { compareFields } from './compare_fields';
import { within } from './field_path';
import { graphQLRootFieldOf } from '../matched_operation';
import type { GraphQLFieldUse, GraphQLRootField } from './graphql_drift';
import {
  compareGraphQLFields,
  diffGraphQLSchemas,
  locateGraphQLRootField,
  resolveGraphQLFieldUse,
  usesCoordinate,
} from './graphql_drift';
import type { OperationLocation } from './locate_operation';
import { locateOperation, serverUrls } from './locate_operation';
import {
  deprecatedPropertyOf,
  isVerifiedByFieldUse,
  isVerifiedByRunning,
  namedComponentOf,
} from './oasdiff_text';
import type { RecordedFieldUse } from '../record/record_actions';
import { NoUsableAuthTypeError } from '../record/record_actions';
import type { ManifestCall, ManifestSource, ProtocolFormat, VendorApiManifest } from '../manifest';
import { isNamedCall, isProtocolFormat, parseManifest } from '../manifest';
import type { DriftProblem } from '../drift_problem';
import { otherProblem } from '../drift_problem';
import { parseSpecText } from '../spec/parse_spec_text';
import { diffProtocolSnapshots, loadProtocolSpec } from '../spec/protocol_sources';
import type { DiffSpecs, OasdiffEntry } from './run_oasdiff';
import { createOasdiff } from './run_oasdiff';
import { toStableJson } from '../stable_json';
import type { UpdateVendorApiResult, VendorApiLog } from '../record/update_vendor_api';
import { updateVendorApi } from '../record/update_vendor_api';
import { errorMessage, isRecord } from '../values';

export type { OperationLocation } from './locate_operation';

export type ChangeKind = 'breaking' | 'deprecation' | 'non-breaking';

/** A change in the latest vendor spec to an operation the connector calls. */
export interface SpecChange {
  readonly kind: ChangeKind;
  /**
   * The rule: of `oasdiff`, e.g. `response-property-enum-value-added`; of `graphql`, e.g.
   * `FIELD_REMOVED`; or for MCP, e.g. `mcp-tool-removed`.
   */
  readonly id: string;
  readonly text: string;
  /**
   * For changes to an operation: `METHOD /path`, an MCP tool's name, or for GraphQL
   * `QUERY rootField`.
   */
  readonly operation?: string;
  /** GraphQL only: the schema coordinate that changed, e.g. `Item.name`. */
  readonly coordinate?: string;
}

export interface SourceDrift {
  /** `unreachable` when the latest spec couldn't be fetched or loaded. */
  readonly status: 'unchanged' | 'changed' | 'unreachable';
  readonly error?: string;
  /** For changed sources; undefined when no `oasdiff` was available to classify them. */
  readonly changes?: readonly SpecChange[];
  /** The server URLs of the committed snapshot and of the latest spec, when it loaded. */
  readonly servers?: { readonly snapshot: readonly string[]; readonly latest: readonly string[] };
  /** Where the source is fetched from, as the manifest records it. */
  readonly url?: string;
  /**
   * For GraphQL and MCP sources, the manifest's format, which names their snapshot file; other
   * formats all snapshot as OpenAPI.
   */
  readonly format?: ProtocolFormat;
}

/** An operation an action calls, as the committed manifest records it. */
export interface ActionOperation {
  readonly source: string;
  /** `METHOD /path`. */
  readonly operation: string;
  /** Where it is in the latest spec; undefined when the latest specs didn't load. */
  readonly latest?: OperationLocation;
}

/** One of the connector's actions, and what the check found for it. */
export interface ActionDrift {
  readonly action: string;
  readonly operations: readonly ActionOperation[];
  /** Requests the manifest records as matching no operation, with the reason it gives. */
  readonly unmatched: readonly { readonly operation: string; readonly reason: string }[];
  /** Problems recording it against the committed snapshots. */
  readonly snapshotProblems: readonly string[];
  /** Problems recording it against the latest specs; undefined when those didn't load. */
  readonly latestProblems?: readonly string[];
  /**
   * What it did with the responses of each operation it calls, by `source METHOD /path`, across
   * the runs against the committed snapshot and the latest spec.
   */
  readonly fieldUse?: Readonly<Record<string, RecordedFieldUse>>;
  /** Whether field use was recorded for every run; false when tracking had to be left off. */
  readonly tracked?: boolean;
  /** Response fields it reads whose schema differs between the snapshot and the latest spec. */
  readonly fieldChanges?: readonly ActionFieldChange[];
  /** For GraphQL root fields, its `fieldUse` by schema coordinate, by `source QUERY field`. */
  readonly graphqlUse?: Readonly<Record<string, GraphQLFieldUse>>;
}

/** A changed response field an action reads. */
export interface ActionFieldChange {
  /** `METHOD /path`, as in the committed manifest. */
  readonly operation: string;
  readonly field: string;
  readonly changes: readonly string[];
}

/** An overlay action that matches nothing in the latest specs. */
export interface StaleCorrection {
  /** Zero-based, as in the overlay's `actions`. */
  readonly index: number;
  readonly target: string;
  /** For a target under `$.paths`, where its path is in the latest specs. */
  readonly latest?: OperationLocation;
}

/**
 * - `healthy`: the actions pass against the committed snapshots and the latest specs.
 * - `vendor-drift`: they pass against the snapshots but not against the latest specs.
 * - `kibana-regression`: they fail against the snapshots already.
 * - `unknown`: a latest spec couldn't be loaded.
 */
export type DriftVerdict = 'healthy' | 'vendor-drift' | 'kibana-regression' | 'unknown';

/** What to do about it: nothing, a PR refreshing the artifacts, or an issue. */
export type DriftOutcome = 'none' | 'refresh' | 'issue';

export interface ConnectorDrift {
  readonly connector: string;
  readonly sources: Readonly<Record<string, SourceDrift>>;
  /** Whether the actions call other operations against the latest specs. */
  readonly operationsChanged: boolean;
  /** Problems recording the actions against the committed snapshots. */
  readonly snapshotProblems: readonly string[];
  /** Problems recording them against the latest specs; undefined when those didn't load. */
  readonly latestProblems?: readonly string[];
  readonly verdict: DriftVerdict;
  /** Overlay actions that no longer apply to the latest specs. */
  readonly overlayFindings: readonly string[];
  readonly outcome: DriftOutcome;
  // The fields below describe the findings for the drift issue. Reports written before they
  // existed lack them, which is why they are optional; `actions` tells the two apart. Only
  // `conclusionsOf` in `drift_issue` reads them, so that is the one place that has to
  // know a report may be of either kind.
  readonly displayName?: string;
  /** The connector's folder, relative to the repository root. */
  readonly folder?: string;
  /** When the check ran, as an ISO timestamp. */
  readonly checkedAt?: string;
  /** Every action of the connector. */
  readonly actions?: readonly ActionDrift[];
  /** Problems that concern no single action, e.g. a missing pagination declaration. */
  readonly otherProblems?: {
    readonly snapshot: readonly DriftProblem[];
    readonly latest?: readonly DriftProblem[];
  };
  readonly staleCorrections?: readonly StaleCorrection[];
  /** The zero-based index of the overlay action that targets the servers, if any. */
  readonly serversCorrection?: number;
}

/** A connector the check couldn't run on at all. */
export interface FailedDrift {
  readonly connector: string;
  readonly error: string;
}

/** An entry of the `--drift` report. */
export type DriftReportEntry = ConnectorDrift | FailedDrift;

export interface DetectDriftOptions {
  readonly connector: ConnectorSpec;
  /** The connector's `vendor_api` folder, which is only read. */
  readonly directory: string;
  readonly fetchText: (url: string) => Promise<string>;
  readonly now: () => Date;
  readonly log: VendorApiLog;
  /** Classifies spec changes; defaults to `oasdiff changelog`. */
  readonly diff?: DiffSpecs;
  /** The connector's folder relative to the repository root, recorded for links. */
  readonly folder?: string;
}

/**
 * Classifies an `oasdiff` change for a vendor API. `oasdiff`'s own levels already treat a
 * response that widens (a new enum value, a longer string, a new `null`) as breaking, as a
 * connector reading the field may not handle it; deprecations and sunsets are their own kind.
 */
export const classifyChange = ({ id, level }: OasdiffEntry): ChangeKind => {
  if (id.startsWith('api-') && id.includes('removed')) {
    return 'breaking';
  }
  if (/deprecat|sunset/.test(id)) {
    return 'deprecation';
  }
  return level >= 2 ? 'breaking' : 'non-breaking';
};

const toSpecChange = (entry: OasdiffEntry): SpecChange => ({
  kind: classifyChange(entry),
  id: entry.id,
  text: entry.text,
  ...(entry.operation && entry.path ? { operation: `${entry.operation} ${entry.path}` } : {}),
});

/**
 * Whether a removal oasdiff reports between two snapshots is only the snapshot's: a snapshot keeps
 * just the operations the actions call, with what they reference, so a path, schema or security
 * scheme the actions stop using drops out though the latest spec still has it.
 */
const stillInSpec = ({ id, text, operation, path: entryPath }: OasdiffEntry, spec: unknown) => {
  if (!isRecord(spec)) {
    return false;
  }
  const { paths, components } = spec;
  if (id.startsWith('api-path-removed') && operation && entryPath && isRecord(paths)) {
    const item = paths[entryPath];
    return isRecord(item) && operation.toLowerCase() in item;
  }
  const name = namedComponentOf(text);
  const section =
    id === 'api-schema-removed'
      ? 'schemas'
      : id === 'api-security-component-removed'
      ? 'securitySchemes'
      : undefined;
  if (!name || !section || !isRecord(components)) {
    return false;
  }
  const named = components[section];
  return isRecord(named) && name in named;
};

// What the actions call; `apiVersion` and `fetchedAt` change without the contract changing.
const callsOf = ({ operations, unmatched }: VendorApiManifest): string =>
  toStableJson({ operations, unmatched: unmatched ?? {} });

const verdictOf = (
  snapshotProblems: readonly string[],
  latestProblems?: readonly string[]
): DriftVerdict =>
  snapshotProblems.length > 0
    ? 'kibana-regression'
    : latestProblems === undefined
    ? 'unknown'
    : latestProblems.length > 0
    ? 'vendor-drift'
    : 'healthy';

const fieldUseComplete = (drift: Omit<ConnectorDrift, 'outcome'>): boolean =>
  drift.actions !== undefined &&
  drift.actions.every(({ operations, tracked }) => operations.length === 0 || tracked === true);

// A breaking change needs no review when running the actions verifies what it changed, or when
// comparing the response fields they read does (`ActionDrift.fieldChanges`).
const verifiedBy = ({ kind, id }: SpecChange, passes: boolean, fieldsCompared: boolean): boolean =>
  kind === 'non-breaking' ||
  (kind === 'breaking' &&
    ((passes && isVerifiedByRunning(id)) || (fieldsCompared && isVerifiedByFieldUse(id))));

const passesBoth = ({ snapshotProblems, latestProblems }: ActionDrift): boolean =>
  snapshotProblems.length === 0 && latestProblems !== undefined && latestProblems.length === 0;

/**
 * Whether a tracked action uses a deprecated property of an operation's request or response:
 * sends it or something in it, reads it or something in it, or copies or returns it whole.
 */
const usesProperty = (
  { fieldUse = {}, graphqlUse = {} }: ActionDrift,
  source: string,
  change: SpecChange,
  property: string
): boolean => {
  const key = `${source} ${change.operation}`;
  // GraphQL changes name a type's field, whichever path the action reached it by.
  if (change.coordinate !== undefined) {
    const coordinates = graphqlUse[key];
    return coordinates === undefined || usesCoordinate(coordinates, change);
  }
  const use = fieldUse[key];
  if (!use) {
    return false;
  }
  if (change.id.startsWith('request-')) {
    return (use.sent ?? []).some((field) => within(field, property));
  }
  return (
    use.read.some((field) => within(field, property)) ||
    [...use.copied, ...use.returned].some(
      (field) => field === '' || within(field, property) || within(property, field)
    )
  );
};

/**
 * Per spec change, the actions calling its operation that need to review it, and whether it
 * needs review at all. Deprecations and sunsets do, unless a deprecated property is one the caller
 * neither sends nor reads; a breaking change does for each caller whose passing against the
 * latest spec doesn't verify it. A change no action calls needs review
 * unless every action passing verifies it.
 */
export const reviewOfChange = (
  drift: Omit<ConnectorDrift, 'outcome'>
): ((
  source: string,
  change: SpecChange
) => { readonly needsReview: boolean; readonly actions: readonly string[] }) => {
  const actions = drift.actions ?? [];
  const passes = drift.verdict === 'healthy';
  const fieldsCompared = passes && fieldUseComplete(drift);
  return (source, change) => {
    const callers = change.operation
      ? actions.filter(({ operations }) =>
          operations.some(
            (candidate) => candidate.source === source && candidate.operation === change.operation
          )
        )
      : [];
    if (callers.length === 0) {
      return { needsReview: !verifiedBy(change, passes, fieldsCompared), actions: [] };
    }
    const property = deprecatedPropertyOf(change.id, change.text);
    const reviewers = callers
      .filter((action) => {
        const passing = passesBoth(action);
        const tracked = passing && action.tracked === true;
        if (property !== undefined && tracked) {
          return usesProperty(action, source, change, property);
        }
        return !verifiedBy(change, passing, tracked);
      })
      .map(({ action }) => action);
    return { needsReview: reviewers.length > 0, actions: reviewers };
  };
};

const outcomeOf = (drift: Omit<ConnectorDrift, 'outcome'>): DriftOutcome => {
  const review = reviewOfChange(drift);
  const needsIssue =
    drift.verdict !== 'healthy' ||
    drift.overlayFindings.length > 0 ||
    (drift.actions ?? []).some(({ fieldChanges = [] }) => fieldChanges.length > 0) ||
    Object.entries(drift.sources).some(
      ([source, { status, changes }]) =>
        status === 'unreachable' ||
        (status === 'changed' &&
          (changes === undefined || changes.some((change) => review(source, change).needsReview)))
    );
  const sources = Object.values(drift.sources);
  if (needsIssue) {
    return 'issue';
  }
  return drift.operationsChanged || sources.some(({ status }) => status === 'changed')
    ? 'refresh'
    : 'none';
};

/** The root fields the manifest records against a GraphQL source. */
const rootFieldsOf = (manifest: VendorApiManifest, source: string): readonly GraphQLRootField[] =>
  Object.values(manifest.operations)
    .flat()
    .flatMap((call) =>
      isNamedCall(call) && call.source === source
        ? [graphQLRootFieldOf(call.name) ?? []].flat()
        : []
    );

const classifyChanges = async ({
  format,
  committed,
  current,
  diff,
  latestDocument,
  rootFields,
}: {
  readonly format: ManifestSource['format'];
  readonly committed: string | undefined;
  readonly current: string | undefined;
  readonly diff: DiffSpecs;
  /** The latest spec, which tells a removal of the whole snapshot from one of its own. */
  readonly latestDocument: unknown;
  /** GraphQL only: the root fields the committed manifest records for the source. */
  readonly rootFields: readonly GraphQLRootField[];
}): Promise<readonly SpecChange[] | undefined> => {
  if (!isProtocolFormat(format)) {
    const entries = await diff(committed ?? '{}', current ?? '{}');
    return entries?.filter((entry) => !stillInSpec(entry, latestDocument)).map(toSpecChange);
  }
  if (committed === undefined || current === undefined) {
    return undefined;
  }
  // A snapshot that can't be read leaves the change unclassified, which gets an issue.
  try {
    return format === 'graphql'
      ? diffGraphQLSchemas(committed, current, rootFields)
      : diffProtocolSnapshots(format, committed, current);
  } catch {
    return undefined;
  }
};

// Only GraphQL and MCP snapshots are named after their format; the rest are OpenAPI.
const protocolFormat = (format: ManifestSource['format']): { format?: ProtocolFormat } =>
  isProtocolFormat(format) ? { format } : {};

interface LatestComparison {
  readonly sources: Record<string, SourceDrift>;
  readonly operationsChanged: boolean;
  readonly problems: readonly string[];
  readonly overlayFindings: readonly string[];
  /** Undefined when recording against the latest specs failed outright. */
  readonly result?: UpdateVendorApiResult;
  /** The problems of such a failure, which has no result to take them from. */
  readonly failure?: readonly DriftProblem[];
}

/**
 * What a recording that failed outright found, with its parts where it has them: a spec whose
 * schemas don't validate names each one, so an issue can table them rather than read them back
 * out of the error's message.
 */
const problemsOfFailure = (error: unknown): DriftProblem[] => {
  if (!(error instanceof NoUsableAuthTypeError)) {
    return [otherProblem(errorMessage(error))];
  }
  return error.authTypes.flatMap(({ authType, message, schemas }) =>
    schemas && schemas.length > 0
      ? schemas.map(({ operation, location, message: schemaMessage }) => ({
          kind: 'invalid-schema' as const,
          authType,
          operation,
          location,
          message: schemaMessage,
        }))
      : [otherProblem(`Auth type ${authType}: ${message}`)]
  );
};

// Regenerates the artifacts from the latest specs in a temporary copy of the folder, and
// compares them with the committed ones.
const compareWithLatest = async ({
  connector,
  directory,
  manifest,
  fetchText,
  now,
  diff,
}: Pick<DetectDriftOptions, 'connector' | 'directory' | 'fetchText' | 'now'> & {
  readonly manifest: VendorApiManifest;
  readonly diff: DiffSpecs;
}): Promise<LatestComparison> => {
  const copy = await fs.mkdtemp(path.join(os.tmpdir(), 'connector-drift-'));
  try {
    await fs.cp(directory, copy, { recursive: true });
    const overlayFindings: string[] = [];
    let result: UpdateVendorApiResult | undefined;
    let failure: DriftProblem[] | undefined;
    const problems = await updateVendorApi({
      connector,
      directory: copy,
      refresh: true,
      trackFields: true,
      fetchText,
      now,
      log: {
        info: () => {},
        warning: (warning) => {
          if (warning.startsWith(OVERLAY)) {
            overlayFindings.push(warning);
          }
        },
      },
    }).then(
      (updated) => {
        result = updated;
        return updated.problems;
      },
      (error) => {
        failure = problemsOfFailure(error);
        return [errorMessage(error)];
      }
    );
    const refreshed = await readOptional(path.join(copy, MANIFEST));
    const sources: Record<string, SourceDrift> = {};
    for (const [name, { url, format }] of Object.entries(manifest.sources)) {
      const [committed, current] = await Promise.all(
        [directory, copy].map((root) => readOptional(path.join(root, snapshotFile(name, format))))
      );
      const latestDocument = result?.specs[name];
      const servers = latestDocument
        ? {
            servers: {
              snapshot: committed ? serverUrls(JSON.parse(committed) as OpenApiDocument) : [],
              latest: serverUrls(latestDocument),
            },
          }
        : {};
      if (committed === current) {
        sources[name] = { status: 'unchanged', ...servers, url, ...protocolFormat(format) };
      } else {
        const changes = await classifyChanges({
          format,
          committed,
          current,
          diff,
          latestDocument,
          rootFields: rootFieldsOf(manifest, name),
        });
        sources[name] = {
          status: 'changed',
          ...(changes === undefined ? {} : { changes }),
          ...servers,
          url,
          ...protocolFormat(format),
        };
      }
    }
    return {
      sources,
      operationsChanged:
        refreshed !== undefined && callsOf(parseManifest(refreshed)) !== callsOf(manifest),
      problems,
      overlayFindings,
      result,
      ...(failure ? { failure } : {}),
    };
  } finally {
    await fs.rm(copy, { recursive: true, force: true });
  }
};

const offline = async (url: string): Promise<string> => {
  throw new Error(`Drift detection records the snapshots offline, but tried to fetch ${url}`);
};

/**
 * Compares a connector's committed `vendor_api` artifacts with the latest vendor specs: records
 * the actions against both (the latest in a temporary copy, so nothing is written), classifies
 * how each spec changed for the operations the connector calls, and says whether that needs a
 * refresh PR or an issue.
 */
export const detectDrift = async ({
  connector,
  directory,
  fetchText,
  now,
  log,
  diff = createOasdiff(),
  folder,
}: DetectDriftOptions): Promise<ConnectorDrift> => {
  const manifestText = await readOptional(path.join(directory, MANIFEST));
  if (manifestText === undefined) {
    throw new Error(`${connector.metadata.id} has no ${MANIFEST}`);
  }
  const manifest = parseManifest(manifestText);
  const quiet: VendorApiLog = { info: () => {}, warning: () => {} };
  const checkedAt = now().toISOString();

  let snapshotResult: UpdateVendorApiResult | undefined;
  let snapshotFailure: DriftProblem[] | undefined;
  const snapshot = await updateVendorApi({
    connector,
    directory,
    check: true,
    trackFields: true,
    fetchText: offline,
    now,
    log: quiet,
  }).then(
    (result) => {
      snapshotResult = result;
      return result.problems;
    },
    (error) => {
      snapshotFailure = problemsOfFailure(error);
      return [errorMessage(error)];
    }
  );

  // Each document is fetched once, for the reachability check and the recording alike.
  const fetched = new Map<string, Promise<string>>();
  const fetchOnce = (url: string) => {
    const text = fetched.get(url) ?? fetchText(url);
    fetched.set(url, text);
    return text;
  };
  const sources: Record<string, SourceDrift> = {};
  for (const [name, source] of Object.entries(manifest.sources)) {
    const { url, format } = source;
    try {
      await (isProtocolFormat(format)
        ? loadProtocolSpec(url, fetchOnce, format, source.endpoints ?? [])
        : loadVendorSpec(url, fetchOnce, source));
    } catch (error) {
      log.warning(
        `${connector.metadata.id}: ${name} at ${url} didn't load: ${errorMessage(error)}`
      );
      sources[name] = {
        status: 'unreachable',
        error: errorMessage(error),
        url,
        ...protocolFormat(source.format),
      };
    }
  }

  const latest =
    Object.keys(sources).length === 0
      ? await compareWithLatest({ connector, directory, manifest, fetchText: fetchOnce, now, diff })
      : undefined;

  const latestSpecs = latest?.result?.specs;
  const overlayText = await readOptional(path.join(directory, OVERLAY));
  const overlay = overlayText ? (parseSpecText(overlayText) as OverlayDocument) : undefined;
  const serversCorrection = overlay?.actions.findIndex(({ target }) =>
    /^\$\.servers\b/.test(target.trim())
  );

  const drift = {
    connector: connector.metadata.id,
    sources: latest?.sources ?? sources,
    operationsChanged: latest?.operationsChanged ?? false,
    snapshotProblems: snapshot,
    ...(latest ? { latestProblems: latest.problems } : {}),
    verdict: verdictOf(snapshot, latest?.problems),
    overlayFindings: latest?.overlayFindings ?? [],
    displayName: connector.metadata.displayName,
    ...(folder === undefined ? {} : { folder }),
    checkedAt,
    actions: Object.keys(connector.actions)
      .sort()
      .map((action) =>
        describeAction({
          action,
          manifest,
          snapshotResult,
          latestResult: latest?.result,
          snapshotSpecs: snapshotResult?.specs,
          latestSpecs,
        })
      ),
    otherProblems: {
      snapshot: snapshotResult?.otherProblems ?? snapshotFailure ?? [],
      ...(latest ? { latest: latest.result?.otherProblems ?? latest.failure ?? [] } : {}),
    },
    staleCorrections: (latest?.result?.staleOverlayActions ?? []).map((index) =>
      describeStaleCorrection(index, overlay, latestSpecs)
    ),
    ...(serversCorrection === undefined || serversCorrection < 0 ? {} : { serversCorrection }),
  };
  return { ...drift, outcome: outcomeOf(drift) };
};

const mergeFieldUse = (
  ...uses: ReadonlyArray<Readonly<Record<string, RecordedFieldUse>> | undefined>
): Record<string, RecordedFieldUse> => {
  const merged: Record<
    string,
    {
      read: Set<string>;
      copied: Set<string>;
      returned: Set<string>;
      sent: Set<string>;
      selected: Set<string>;
    }
  > = {};
  for (const byOperation of uses) {
    for (const [key, use] of Object.entries(byOperation ?? {})) {
      const entry = (merged[key] ??= {
        read: new Set(),
        copied: new Set(),
        returned: new Set(),
        sent: new Set(),
        selected: new Set(),
      });
      use.read.forEach((field) => entry.read.add(field));
      use.copied.forEach((field) => entry.copied.add(field));
      use.returned.forEach((field) => entry.returned.add(field));
      use.sent?.forEach((field) => entry.sent.add(field));
      use.selected?.forEach((field) => entry.selected.add(field));
    }
  }
  return Object.fromEntries(
    Object.entries(merged).map(([key, { read, copied, returned, sent, selected }]) => [
      key,
      {
        read: [...read].sort(),
        copied: [...copied].sort(),
        returned: [...returned].sort(),
        ...(sent.size > 0 ? { sent: [...sent].sort() } : {}),
        ...(selected.size > 0 ? { selected: [...selected].sort() } : {}),
      },
    ])
  );
};

// The SDL a run recorded for a GraphQL source.
const sdlOf = (result: UpdateVendorApiResult | undefined, source: string): string | undefined => {
  const spec = result?.protocols[source];
  return spec?.format === 'graphql' ? spec.sdl : undefined;
};

const describeAction = ({
  action,
  manifest,
  snapshotResult,
  latestResult,
  snapshotSpecs,
  latestSpecs,
}: {
  readonly action: string;
  readonly manifest: VendorApiManifest;
  readonly snapshotResult?: UpdateVendorApiResult;
  readonly latestResult?: UpdateVendorApiResult;
  readonly snapshotSpecs?: Readonly<Record<string, OpenApiDocument>>;
  readonly latestSpecs?: Readonly<Record<string, OpenApiDocument>>;
}): ActionDrift => {
  const isGraphQL = (source: string) => manifest.sources[source]?.format === 'graphql';
  // A GraphQL call names its root field (`query boards`), which stands in for a method and path.
  const callOf = (call: ManifestCall): { method: string; path: string } | undefined =>
    isNamedCall(call) ? graphQLRootFieldOf(call.name) : { method: call.method, path: call.path };
  const operations = (manifest.operations[action] ?? []).flatMap((call) => {
    const { source } = call;
    const named = callOf(call);
    if (!named) {
      // An MCP tool is named rather than addressed by method and path, so it has no location in
      // an OpenAPI document and nothing to compare field by field.
      return isNamedCall(call) ? [{ source, method: '', path: '', operation: call.name }] : [];
    }
    const { method, path: opPath } = named;
    const document = latestSpecs?.[source];
    const schema = sdlOf(latestResult, source);
    const latest = isGraphQL(source)
      ? schema && locateGraphQLRootField(schema, { method, path: opPath })
      : document && locateOperation(document, opPath, method);
    return [
      {
        source,
        method,
        path: opPath,
        operation: `${method.toUpperCase()} ${opPath}`,
        ...(latest ? { latest } : {}),
      },
    ];
  });
  const recorded = [snapshotResult, latestResult].filter(
    (result): result is UpdateVendorApiResult => result?.fieldUse !== undefined
  );
  const fieldUse = mergeFieldUse(...recorded.map((result) => result.fieldUse?.[action]));
  const tracked =
    recorded.length > 0 && recorded.every((result) => !result.untracked?.includes(action));
  // Where the operation still is in the latest spec, the fields it reads are compared.
  const fieldChanges = operations.flatMap(({ source, method, path: opPath, operation, latest }) => {
    const fields = fieldUse[`${source} ${operation}`]?.read ?? [];
    if (isGraphQL(source)) {
      const [committed, current] = [sdlOf(snapshotResult, source), sdlOf(latestResult, source)];
      return committed && current && fields.length > 0
        ? compareGraphQLFields(committed, current, { method, path: opPath }, fields).map(
            ({ field, changes }) => ({ operation, field, changes })
          )
        : [];
    }
    const [before, after] = [snapshotSpecs?.[source], latestSpecs?.[source]];
    if (!before || !after || fields.length === 0 || latest?.status === 'missing') {
      return [];
    }
    return compareFields({
      before,
      after,
      method,
      path: opPath,
      latestPath: latest?.status === 'moved' ? latest.path : opPath,
      fields,
    }).map(({ field, changes }) => ({ operation, field, changes }));
  });
  // GraphQL changes name a type's field, so the field use is resolved to those too.
  const graphqlUse = Object.fromEntries(
    operations.flatMap(({ source, method, path: opPath, operation }) => {
      const key = `${source} ${operation}`;
      const schema = sdlOf(snapshotResult, source) ?? sdlOf(latestResult, source);
      const resolved =
        isGraphQL(source) && schema && fieldUse[key]
          ? resolveGraphQLFieldUse(schema, { method, path: opPath }, fieldUse[key])
          : undefined;
      return resolved ? [[key, resolved] as const] : [];
    })
  );
  return {
    action,
    operations: operations.map(({ source, operation, latest }) => ({
      source,
      operation,
      ...(latest ? { latest } : {}),
    })),
    unmatched: (manifest.unmatched?.[action] ?? []).map(
      ({ method, path: requestPath, reason }) => ({
        operation: `${method.toUpperCase()} ${requestPath}`,
        reason,
      })
    ),
    snapshotProblems: snapshotResult?.problemsByAction[action] ?? [],
    ...(latestResult ? { latestProblems: latestResult.problemsByAction[action] ?? [] } : {}),
    ...(recorded.length > 0 ? { fieldUse, tracked, fieldChanges } : {}),
    ...(Object.keys(graphqlUse).length > 0 ? { graphqlUse } : {}),
  };
};

// `$.paths['/items/{id}'].put…` targets the path `/items/{id}`.
const TARGET_PATH = /^\$\.paths\[['"]([^'"]+)['"]\]/;

const describeStaleCorrection = (
  index: number,
  overlay: OverlayDocument | undefined,
  latestSpecs: Readonly<Record<string, OpenApiDocument>> | undefined
): StaleCorrection => {
  const target = overlay?.actions[index]?.target.trim() ?? '';
  const targetPath = target.match(TARGET_PATH)?.[1];
  if (targetPath === undefined || latestSpecs === undefined) {
    return { index, target };
  }
  // Present or moved in any source counts, as an overlay action applies to every source.
  const locations = Object.values(latestSpecs).map((document) =>
    locateOperation(document, targetPath)
  );
  const latest =
    locations.find(({ status }) => status === 'present') ??
    locations.find(({ status }) => status === 'moved') ??
    ({ status: 'missing' } as const);
  return { index, target, latest };
};
