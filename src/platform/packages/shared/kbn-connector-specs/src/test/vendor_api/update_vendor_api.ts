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
import type { OpenApiDocument, OverlayDocument } from '@kbn/connector-contract-mock';
import { applyOverlay, convertSwagger2 } from '@kbn/connector-contract-mock';
import type { ConnectorSpec } from '../../connector_spec';
import { bundleSpec } from './bundle_spec';
import { isJsonObject } from './json_pointer';
import type { VendorApiFixtures } from './fixtures';
import { vendorApiFixturesSchema } from './fixtures';
import type { ManifestSource, UnmatchedRequest, VendorApiManifest } from './manifest';
import { parseManifest, serializeManifest } from './manifest';
import { parseSpecText } from './parse_spec_text';
import { projectSpec } from './project_spec';
import type { RecordingFinding } from './record_actions';
import { recordActions } from './record_actions';
import { toStableJson } from './stable_json';

export interface VendorApiLog {
  readonly info: (message: string) => void;
  readonly warning: (message: string) => void;
}

export interface UpdateVendorApiOptions {
  readonly connector: ConnectorSpec;
  /** The connector's `vendor_api` folder. */
  readonly directory: string;
  /** Sources to add or point elsewhere, by name; the manifest's are kept otherwise. */
  readonly sources?: Readonly<Record<string, string>>;
  /**
   * Fetches the full vendor specs. Without it, actions are recorded against the committed
   * snapshots, which only picks up changes on the connector's side.
   */
  readonly refresh?: boolean;
  /** Reports what would change instead of writing it. */
  readonly check?: boolean;
  readonly fetchText: (url: string) => Promise<string>;
  readonly now: () => Date;
  readonly log: VendorApiLog;
}

export interface UpdateVendorApiResult {
  /** Files that were written, or with `check`, would be. */
  readonly changed: readonly string[];
  /** What makes the artifacts untrustworthy; the script fails when there are any. */
  readonly problems: readonly string[];
}

const MANIFEST = 'manifest.json';
const FIXTURES = 'fixtures.json';
const OVERLAY = 'overlay.yaml';
const snapshotFile = (source: string) => path.join('snapshots', `${source}.openapi.json`);

const readOptional = async (file: string): Promise<string | undefined> => {
  try {
    return await fs.readFile(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
};

const formatOf = (document: OpenApiDocument): ManifestSource['format'] =>
  document.swagger === '2.0' ? 'swagger' : 'openapi';

const apiVersionOf = ({ info }: OpenApiDocument): string | undefined => {
  const version = isJsonObject(info) ? info.version : undefined;
  return typeof version === 'string' ? version : undefined;
};

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

const describeFinding = (finding: RecordingFinding): string => {
  switch (finding.kind) {
    case 'no-input':
      return `${finding.action}: no generated input passes the action's schema; add an input to ${FIXTURES}`;
    case 'handler-error':
      return `${finding.action}: the handler threw: ${finding.message}`;
    case 'request-violation':
      return `${finding.action}: ${finding.request} breaks the spec: ${finding.violations
        .map(({ message }) => message)
        .join('; ')}`;
    case 'read-scope':
      return `${finding.action}: has scope 'read' but sent ${finding.request}; if the operation only queries, add it to the action's "queries" in ${FIXTURES}, otherwise correct the scope`;
    case 'unused-query':
      return `${finding.action}: lists ${finding.operation} in "queries" in ${FIXTURES}, but no request of a 'read' scoped run needed it; remove it`;
    case 'rejected-response':
      return `${finding.action}: the response override for ${
        finding.operation
      } breaks the spec: ${finding.violations.map(({ message }) => message).join('; ')}`;
  }
};

const isProblem = ({ kind }: RecordingFinding): boolean =>
  kind === 'read-scope' || kind === 'unused-query' || kind === 'rejected-response';

/**
 * Regenerates a connector's `vendor_api` artifacts: records its actions against the vendor
 * specs (the full ones with `refresh`, the committed snapshots otherwise), then writes the
 * manifest and the snapshots projected from the raw specs, without the overlay.
 */
export const updateVendorApi = async ({
  connector,
  directory,
  sources: sourceFlags = {},
  refresh = false,
  check = false,
  fetchText,
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
  const fetchAll = refresh || Object.keys(sourceFlags).length > 0;

  const raw: Record<string, OpenApiDocument> = {};
  const formats: Record<string, ManifestSource['format']> = {};
  for (const [name, url] of Object.entries(urls)) {
    const snapshot = fetchAll ? undefined : await read(snapshotFile(name));
    if (snapshot === undefined) {
      log.info(`Fetching ${name} from ${url}`);
      const document = parseSpecText(await fetchText(url)) as OpenApiDocument;
      const load = async (documentUrl: string) => parseSpecText(await fetchText(documentUrl));
      const bundled = await bundleSpec(document, { url, load });
      formats[name] = formatOf(bundled);
      raw[name] = formats[name] === 'swagger' ? convertSwagger2(bundled) : bundled;
    } else {
      raw[name] = JSON.parse(snapshot);
      formats[name] = previous?.sources[name]?.format ?? 'openapi';
    }
  }

  // One overlay corrects every source; an action only needs to match in one of them.
  const specs: Record<string, OpenApiDocument> = {};
  const matched = new Set<number>();
  for (const [name, document] of Object.entries(raw)) {
    const result = overlay ? applyOverlay(document, overlay) : { document, findings: [] };
    specs[name] = result.document;
    const missed = new Set(
      result.findings.filter(({ problem }) => problem === 'no-match').map(({ index }) => index)
    );
    overlay?.actions.forEach((_, index) => !missed.has(index) && matched.add(index));
  }
  overlay?.actions.forEach((_, index) => {
    if (!matched.has(index)) {
      log.warning(
        `${OVERLAY} action ${index} matches nothing in any source; the vendor may have fixed it`
      );
    }
  });

  log.info(
    `Recording ${Object.keys(connector.actions).length} actions of ${connector.metadata.id}`
  );
  const recording = await recordActions({ connector, specs, fixtures });
  // Each generated input reports its own findings, which are often the same.
  const problems = new Set<string>();
  const warnings = new Set<string>();
  for (const finding of recording.findings) {
    (isProblem(finding) ? problems : warnings).add(describeFinding(finding));
  }
  warnings.forEach((warning) => log.warning(warning));

  const unmatched: Record<string, UnmatchedRequest[]> = {};
  for (const [action, requests] of Object.entries(recording.unmatched)) {
    for (const { method, path: requestPath } of requests) {
      const acknowledged = previous?.unmatched?.[action]?.find(
        (entry) => entry.method === method && entry.path === requestPath
      );
      if (acknowledged) {
        unmatched[action] = [...(unmatched[action] ?? []), acknowledged];
      } else {
        const refreshHint = fetchAll ? '' : '; if it is new to the connector, rerun with --refresh';
        problems.add(
          `${action}: ${method.toUpperCase()} ${requestPath} matches no operation of any source; correct the spec in ${OVERLAY}, or add it to "unmatched" in ${MANIFEST} with a reason${refreshHint}`
        );
      }
    }
  }

  const files: Record<string, string> = {};
  const sources: Record<string, ManifestSource> = {};
  for (const [name, document] of Object.entries(raw)) {
    const operations = Object.values(recording.operations)
      .flat()
      .filter(({ source }) => source === name);
    const file = snapshotFile(name);
    files[file] = toStableJson(projectSpec(document, operations));
    const unchanged = (await read(file)) === files[file];
    const apiVersion = fetchAll ? apiVersionOf(document) : previous?.sources[name]?.apiVersion;
    const fetchedAt = unchanged ? previous?.sources[name]?.fetchedAt : undefined;
    sources[name] = {
      format: formats[name],
      url: urls[name],
      ...(apiVersion === undefined ? {} : { apiVersion }),
      fetchedAt: fetchedAt ?? now().toISOString(),
    };
  }
  files[MANIFEST] = serializeManifest({
    sources,
    operations: recording.operations,
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
  return { changed, problems: [...problems] };
};
