/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { stringify } from 'yaml';
import type { OpenApiDocument, OverlayDocument } from '@kbn/connector-contract-mock';
import { applyOverlay } from '@kbn/connector-contract-mock';
import { describeOperation, findOperation, listOperations } from './inspect_spec';
import { isJsonObject } from './json_pointer';
import { loadVendorSpec } from './load_vendor_spec';
import { parseManifest } from './manifest';
import { parseSpecText } from './parse_spec_text';
import { readOptional } from './update_vendor_api';

/** Operations listed per source before the list is cut short. */
export const LIST_LIMIT = 200;

export interface InspectVendorApiOptions {
  /** Specs to inspect by source name; without them, the sources in the connector's manifest. */
  readonly sources: Readonly<Record<string, string>>;
  /** A connector's `vendor_api` folder, whose manifest sources and overlay are used. */
  readonly directory?: string;
  /** `METHOD /path` or `operationId` of operations to describe; lists operations otherwise. */
  readonly operations: readonly string[];
  /** Case-insensitive pattern the listed operations must match. */
  readonly grep?: string;
  readonly depth?: number;
  readonly fetchText: (url: string) => Promise<string>;
  readonly log: { readonly info: (message: string) => void };
}

export interface InspectVendorApiResult {
  readonly output: string;
  readonly problems: readonly string[];
}

const titleOf = ({ info }: OpenApiDocument): string => {
  const { title, version } = isJsonObject(info) ? info : {};
  return [title, version].filter((part) => typeof part === 'string').join(' ');
};

/**
 * Shows what vendor specs offer before a connector is written against them: the operations
 * they list, or for chosen operations everything an action needs to call one. Specs are
 * loaded the way recording loads them, with the connector's overlay applied.
 */
export const inspectVendorApi = async ({
  sources: sourceFlags,
  directory,
  operations,
  grep,
  depth,
  fetchText,
  log,
}: InspectVendorApiOptions): Promise<InspectVendorApiResult> => {
  const manifestText = directory
    ? await readOptional(path.join(directory, 'manifest.json'))
    : undefined;
  const overlayText = directory
    ? await readOptional(path.join(directory, 'overlay.yaml'))
    : undefined;
  const overlay = overlayText ? (parseSpecText(overlayText) as OverlayDocument) : undefined;
  const urls =
    Object.keys(sourceFlags).length > 0 || manifestText === undefined
      ? sourceFlags
      : Object.fromEntries(
          Object.entries(parseManifest(manifestText).sources).map(([name, { url }]) => [name, url])
        );
  if (Object.keys(urls).length === 0) {
    throw new Error('pass the specs to inspect with --source, or a --connector with a manifest');
  }

  const documents: Record<string, OpenApiDocument> = {};
  for (const [name, url] of Object.entries(urls)) {
    log.info(`Fetching ${name} from ${url}`);
    const { document } = await loadVendorSpec(url, fetchText);
    documents[name] = overlay ? applyOverlay(document, overlay).document : document;
  }

  const sections: string[] = [];
  const problems: string[] = [];
  if (operations.length > 0) {
    for (const query of operations) {
      const found = Object.entries(documents).flatMap(([source, document]) => {
        const match = findOperation(document, query);
        const description = match && describeOperation(document, match, { depth });
        return description ? [{ source, ...description }] : [];
      });
      if (found.length === 0) {
        problems.push(
          `${query} matches no operation of ${Object.keys(documents).join(
            ', '
          )}; list them with --grep`
        );
      }
      sections.push(...found.map((description) => stringify(description, { lineWidth: 0 })));
    }
    return { output: sections.join('---\n'), problems };
  }

  const pattern = grep === undefined ? undefined : new RegExp(grep, 'i');
  for (const [source, document] of Object.entries(documents)) {
    const listed = listOperations(document).filter(
      ({ method, path: operationPath, operationId = '', summary = '' }) =>
        !pattern ||
        pattern.test(`${method.toUpperCase()} ${operationPath} ${operationId} ${summary}`)
    );
    const lines = listed
      .slice(0, LIST_LIMIT)
      .map(
        ({ method, path: operationPath, operationId, summary, deprecated }) =>
          `  ${method.toUpperCase().padEnd(7)} ${operationPath}${
            operationId ? `  ${operationId}` : ''
          }${summary ? `  ${summary}` : ''}${deprecated ? '  (deprecated)' : ''}`
      );
    const more =
      listed.length > LIST_LIMIT
        ? [`  … ${listed.length - LIST_LIMIT} more; narrow the list with --grep`]
        : [];
    sections.push(
      [`${source}: ${titleOf(document)}, ${listed.length} operation(s)`, ...lines, ...more].join(
        '\n'
      )
    );
  }
  return { output: sections.join('\n\n'), problems };
};
