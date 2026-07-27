/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndexManifest, JsonObject, VariantName } from './types';
import { sha256Hex, stableStringify } from './measure';

/**
 * Reads a variant document by its path relative to the bundle root (the
 * directory that contains `index.json`). Consumers back this with `fs`, an HTTP
 * client, an in-memory map, etc.
 */
export interface ArtifactReader {
  readJson(relativePath: string): Promise<JsonObject> | JsonObject;
}

/**
 * Returns the JSON Schema document for a variant, verifying its `sha256` against
 * the manifest. Each variant is a single self-contained `schema.json`.
 */
export const loadVariantSchema = async (
  manifest: IndexManifest,
  variant: VariantName,
  reader: ArtifactReader
): Promise<JsonObject> => {
  const entry = manifest.variants[variant];
  if (!entry) {
    throw new Error(`Variant "${variant}" is not present in the manifest`);
  }

  const content = await reader.readJson(entry.path);
  const actualSha = sha256Hex(stableStringify(content, false));
  if (actualSha !== entry.sha256) {
    throw new Error(
      `Integrity check failed for "${entry.path}": expected ${entry.sha256}, got ${actualSha}`
    );
  }

  return content;
};
