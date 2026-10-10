/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenApiDocument } from '@kbn/connector-contract-mock';
import {
  convertDiscovery,
  convertSwagger2,
  isDiscoveryDocument,
} from '@kbn/connector-contract-mock';
import { bundleSpec } from './bundle_spec';
import { isJsonObject } from './json_pointer';
import type { ManifestSource } from './manifest';
import { parseSpecText } from './parse_spec_text';

export interface LoadedVendorSpec {
  /** The format the vendor publishes. */
  readonly format: ManifestSource['format'];
  /** The spec's `info.version`. */
  readonly apiVersion?: string;
  /** The spec as one OpenAPI 3.x document, with external `$ref`s bundled in. */
  readonly document: OpenApiDocument;
}

const apiVersionOf = ({ info }: OpenApiDocument): { apiVersion?: string } => {
  const version = isJsonObject(info) ? info.version : undefined;
  return typeof version === 'string' ? { apiVersion: version } : {};
};

/**
 * Fetches a vendor spec and turns it into one OpenAPI 3.x document: Google Discovery and
 * Swagger 2.0 are converted, external `$ref`s are bundled.
 */
export const loadVendorSpec = async (
  url: string,
  fetchText: (url: string) => Promise<string>
): Promise<LoadedVendorSpec> => {
  const parsed = parseSpecText(await fetchText(url)) as OpenApiDocument;
  // Discovery `$ref`s are schema names, which bundling would take for relative URLs.
  const discovery = isDiscoveryDocument(parsed);
  const document = discovery ? convertDiscovery(parsed) : parsed;
  const load = async (documentUrl: string) => parseSpecText(await fetchText(documentUrl));
  const bundled = await bundleSpec(document, { url, load });
  if (discovery) {
    return { format: 'discovery', ...apiVersionOf(bundled), document: bundled };
  }
  return bundled.swagger === '2.0'
    ? { format: 'swagger', ...apiVersionOf(bundled), document: convertSwagger2(bundled) }
    : { format: 'openapi', ...apiVersionOf(bundled), document: bundled };
};
