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
import type { ConnectorSpec } from '../../connector_spec';
import { loadVendorSpec } from './load_vendor_spec';
import { MANIFEST, OVERLAY, readOptional, snapshotFile } from './load_vendor_specs';
import type { OperationLocation } from './locate_operation';
import { locateOperation, serverUrls } from './locate_operation';
import type { VendorApiManifest } from './manifest';
import { parseManifest } from './manifest';
import { parseSpecText } from './parse_spec_text';
import type { DiffSpecs, OasdiffEntry } from './run_oasdiff';
import { createOasdiff } from './run_oasdiff';
import { toStableJson } from './stable_json';
import type { UpdateVendorApiResult, VendorApiLog } from './update_vendor_api';
import { updateVendorApi } from './update_vendor_api';

export type { OperationLocation } from './locate_operation';

export type ChangeKind = 'breaking' | 'deprecation' | 'non-breaking';

/** A change in the latest vendor spec to an operation the connector calls. */
export interface SpecChange {
  readonly kind: ChangeKind;
  /** The `oasdiff` rule, e.g. `response-property-enum-value-added`. */
  readonly id: string;
  readonly text: string;
  /** `METHOD /path`, for changes to an operation. */
  readonly operation?: string;
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
  // existed lack them.
  readonly displayName?: string;
  /** The connector's folder, relative to the repository root. */
  readonly folder?: string;
  /** When the check ran, as an ISO timestamp. */
  readonly checkedAt?: string;
  /** Every action of the connector. */
  readonly actions?: readonly ActionDrift[];
  /** Problems that concern no single action, e.g. a missing pagination declaration. */
  readonly otherProblems?: {
    readonly snapshot: readonly string[];
    readonly latest?: readonly string[];
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

const message = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

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

const outcomeOf = (drift: Omit<ConnectorDrift, 'outcome'>): DriftOutcome => {
  const sources = Object.values(drift.sources);
  const needsIssue =
    drift.verdict !== 'healthy' ||
    drift.overlayFindings.length > 0 ||
    sources.some(
      ({ status, changes }) =>
        status === 'unreachable' ||
        (status === 'changed' &&
          (changes === undefined || changes.some(({ kind }) => kind !== 'non-breaking')))
    );
  if (needsIssue) {
    return 'issue';
  }
  return drift.operationsChanged || sources.some(({ status }) => status === 'changed')
    ? 'refresh'
    : 'none';
};

interface LatestComparison {
  readonly sources: Record<string, SourceDrift>;
  readonly operationsChanged: boolean;
  readonly problems: readonly string[];
  readonly overlayFindings: readonly string[];
  /** Undefined when recording against the latest specs failed outright. */
  readonly result?: UpdateVendorApiResult;
}

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
    const problems = await updateVendorApi({
      connector,
      directory: copy,
      refresh: true,
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
      (error) => [message(error)]
    );
    const refreshed = await readOptional(path.join(copy, MANIFEST));
    const sources: Record<string, SourceDrift> = {};
    for (const name of Object.keys(manifest.sources)) {
      const [committed, current] = await Promise.all(
        [directory, copy].map((root) => readOptional(path.join(root, snapshotFile(name))))
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
      const { url } = manifest.sources[name];
      if (committed === current) {
        sources[name] = { status: 'unchanged', ...servers, url };
      } else {
        const entries = await diff(committed ?? '{}', current ?? '{}');
        sources[name] = {
          status: 'changed',
          ...(entries === undefined ? {} : { changes: entries.map(toSpecChange) }),
          ...servers,
          url,
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
  const snapshot = await updateVendorApi({
    connector,
    directory,
    check: true,
    fetchText: offline,
    now,
    log: quiet,
  }).then(
    (result) => {
      snapshotResult = result;
      return result.problems;
    },
    (error) => [message(error)]
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
    const { url } = source;
    try {
      await loadVendorSpec(url, fetchOnce, source);
    } catch (error) {
      log.warning(`${connector.metadata.id}: ${name} at ${url} didn't load: ${message(error)}`);
      sources[name] = { status: 'unreachable', error: message(error), url };
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
          latestSpecs,
        })
      ),
    otherProblems: {
      snapshot: snapshotResult?.otherProblems ?? snapshot,
      ...(latest ? { latest: latest.result?.otherProblems ?? latest.problems } : {}),
    },
    staleCorrections: (latest?.result?.staleOverlayActions ?? []).map((index) =>
      describeStaleCorrection(index, overlay, latestSpecs)
    ),
    ...(serversCorrection === undefined || serversCorrection < 0 ? {} : { serversCorrection }),
  };
  return { ...drift, outcome: outcomeOf(drift) };
};

const describeAction = ({
  action,
  manifest,
  snapshotResult,
  latestResult,
  latestSpecs,
}: {
  readonly action: string;
  readonly manifest: VendorApiManifest;
  readonly snapshotResult?: UpdateVendorApiResult;
  readonly latestResult?: UpdateVendorApiResult;
  readonly latestSpecs?: Readonly<Record<string, OpenApiDocument>>;
}): ActionDrift => ({
  action,
  operations: (manifest.operations[action] ?? []).map(({ source, method, path: opPath }) => {
    const document = latestSpecs?.[source];
    return {
      source,
      operation: `${method.toUpperCase()} ${opPath}`,
      ...(document ? { latest: locateOperation(document, opPath, method) } : {}),
    };
  }),
  unmatched: (manifest.unmatched?.[action] ?? []).map(({ method, path: requestPath, reason }) => ({
    operation: `${method.toUpperCase()} ${requestPath}`,
    reason,
  })),
  snapshotProblems: snapshotResult?.problemsByAction[action] ?? [],
  ...(latestResult ? { latestProblems: latestResult.problemsByAction[action] ?? [] } : {}),
});

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
