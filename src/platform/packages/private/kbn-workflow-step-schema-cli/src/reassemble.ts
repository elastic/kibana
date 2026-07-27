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
 * Reads chunk/document files by their path relative to the bundle root (the
 * directory that contains `index.json`). Consumers back this with `fs`, an HTTP
 * client, an in-memory map, etc.
 */
export interface ArtifactReader {
  readJson(relativePath: string): Promise<JsonObject> | JsonObject;
}

/**
 * Returns one JSON Schema document for a variant, regardless of storage mode.
 *
 * The merge logic is uniform: the `root` chunk is the base document; each
 * `def`/`step` chunk is reinserted into the definitions map under its original
 * key. In `single` mode there is only a `root` chunk (the whole self-contained
 * document), so the merge is a passthrough. Every chunk's `sha256` is verified.
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

  let root: JsonObject | undefined;
  const definitions: JsonObject = {};
  let sawDefinition = false;

  for (const chunk of entry.chunks) {
    const content = await reader.readJson(chunk.path);
    const actualSha = sha256Hex(stableStringify(content, false));
    if (actualSha !== chunk.sha256) {
      throw new Error(
        `Integrity check failed for chunk "${chunk.path}": expected ${chunk.sha256}, got ${actualSha}`
      );
    }

    if (chunk.role === 'root') {
      root = content;
    } else {
      if (!chunk.name) {
        throw new Error(`Chunk "${chunk.path}" of role "${chunk.role}" is missing its name`);
      }
      definitions[chunk.name] = content;
      sawDefinition = true;
    }
  }

  if (!root) {
    throw new Error(`Variant "${variant}" has no root chunk`);
  }

  if (sawDefinition) {
    const defsKey = entry.defsKey ?? 'definitions';
    root[defsKey] = definitions;
  }

  return root;
};
