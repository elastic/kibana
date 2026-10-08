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
  OpenApiDocument,
  OverlayDocument,
  PaginatedOperation,
} from '@kbn/connector-contract-mock';
import { applyOverlay } from '@kbn/connector-contract-mock';
import { loadVendorSpec } from './load_vendor_spec';
import type { VendorApiManifest } from './manifest';
import { parseManifest } from './manifest';
import { parseSpecText } from './parse_spec_text';

export const MANIFEST = 'manifest.json';
export const FIXTURES = 'fixtures.json';
export const OVERLAY = 'overlay.yaml';
export const snapshotFile = (source: string) => path.join('snapshots', `${source}.openapi.json`);

export interface VendorApiLog {
  readonly info: (message: string) => void;
  readonly warning: (message: string) => void;
}

/** Reads a file that may not exist yet. */
export const readOptional = async (file: string): Promise<string | undefined> => {
  try {
    return await fs.readFile(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
};

/** Applies the overlay to every source; an action only needs to match in one of them. */
export const applyOverlayToSources = (
  raw: Readonly<Record<string, OpenApiDocument>>,
  overlay: OverlayDocument | undefined,
  log: VendorApiLog
): Record<string, OpenApiDocument> => {
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
  return specs;
};

/** The manifest's pagination entries, once per operation, as the contract mock takes them. */
export const toMockPagination = (manifest: VendorApiManifest): PaginatedOperation[] => {
  const byOperation = new Map<string, PaginatedOperation>();
  for (const { source, method, path: operationPath, pagination } of Object.values(
    manifest.operations
  ).flat()) {
    if (pagination && pagination !== 'none') {
      byOperation.set(`${source} ${method} ${operationPath}`, {
        operation: { source, method, path: operationPath },
        pagination,
      });
    }
  }
  return [...byOperation.values()];
};

export interface LoadVendorSpecsOptions {
  /** The connector's `vendor_api` folder. */
  readonly directory: string;
  /** Fetches each source's current spec instead of reading the committed snapshot. */
  readonly latest?: boolean;
  readonly fetchText: (url: string) => Promise<string>;
  readonly log: VendorApiLog;
}

export interface VendorSpecs {
  readonly manifest: VendorApiManifest;
  /** Each source's spec, with the overlay applied. */
  readonly specs: Record<string, OpenApiDocument>;
  readonly pagination: PaginatedOperation[];
}

/** Loads the vendor specs a connector's committed `vendor_api` artifacts describe. */
export const loadVendorSpecs = async ({
  directory,
  latest = false,
  fetchText,
  log,
}: LoadVendorSpecsOptions): Promise<VendorSpecs> => {
  const read = (file: string) => readOptional(path.join(directory, file));
  const manifestText = await read(MANIFEST);
  if (manifestText === undefined) {
    throw new Error(
      `${directory} has no ${MANIFEST}; record it with node scripts/connector_vendor_api`
    );
  }
  const manifest = parseManifest(manifestText);
  const overlayText = await read(OVERLAY);
  const overlay = overlayText ? (parseSpecText(overlayText) as OverlayDocument) : undefined;

  const raw: Record<string, OpenApiDocument> = {};
  for (const [name, { url }] of Object.entries(manifest.sources)) {
    const snapshot = latest ? undefined : await read(snapshotFile(name));
    if (snapshot === undefined) {
      log.info(`Fetching ${name} from ${url}`);
      raw[name] = (await loadVendorSpec(url, fetchText)).document;
    } else {
      raw[name] = JSON.parse(snapshot);
    }
  }
  return {
    manifest,
    specs: applyOverlayToSources(raw, overlay, log),
    pagination: toMockPagination(manifest),
  };
};
