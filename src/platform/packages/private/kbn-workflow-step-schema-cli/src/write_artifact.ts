/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import Path from 'path';
import { sha256Hex, stableStringify } from './hash';
import { isObject } from './schema_helpers';
import type { IndexManifest, JsonObject, JsonValue, VariantManifest, VariantName } from './types';

/**
 * Recursively sort the members of order-insensitive JSON Schema array keywords
 * (`anyOf`, `oneOf`, `required`) by their stable-stringified content.
 *
 * This is a belt-and-braces pass: the primary determinism guarantee comes from
 * sorting the connector/trigger arrays before `z.toJSONSchema` runs (which pins
 * `__schemaN` definition numbering). This pass catches any remaining order
 * instability in the final document.
 *
 * Intentionally NOT sorted:
 * - `enum` — member order is curated (e.g. `["CRITICAL","HIGH","MEDIUM","LOW"]`);
 *   alphabetizing it would reorder autocomplete suggestions in external editors.
 * - `allOf` — no determinism benefit in this schema; sorting would cause churn.
 * - `items` / `prefixItems` — tuple semantics; order is load-bearing.
 */
const canonicalizeUnions = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value.map(canonicalizeUnions);
  }
  if (!isObject(value)) {
    return value;
  }
  const result: JsonObject = {};
  for (const key of Object.keys(value)) {
    const child = value[key];
    if ((key === 'anyOf' || key === 'oneOf' || key === 'required') && Array.isArray(child)) {
      // Sort members by stable-stringified content so the same set of members
      // always yields the same byte sequence regardless of source order.
      result[key] = [...child]
        .map(canonicalizeUnions)
        .sort((a, b) => stableStringify(a).localeCompare(stableStringify(b)));
    } else {
      result[key] = canonicalizeUnions(child);
    }
  }
  return result;
};

export interface WriteVariantOptions {
  /** Absolute bundle directory: `<output-dir>/<kibanaVersion>/<channel>`. */
  bundleDir: string;
  variant: VariantName;
  doc: JsonObject;
}

/**
 * Emit a variant as a single self-contained `<variant>/schema.json` (minified,
 * key-sorted) and return its manifest entry. The `sha256` is computed over the
 * exact bytes written so a consumer can verify the served file byte-for-byte.
 */
export const writeVariant = ({ bundleDir, variant, doc }: WriteVariantOptions): VariantManifest => {
  const relativePath = `${variant}/schema.json`;
  // Canonicalize order-insensitive union arrays (anyOf/oneOf/required) before
  // hashing so that runs with different async step-loader resolution order
  // produce byte-identical output for the same schema content.
  const canonical = canonicalizeUnions(doc) as JsonObject;
  // Minified + key-sorted: this is exactly what is written and served.
  const serialized = stableStringify(canonical, false);
  const absolutePath = Path.join(bundleDir, relativePath);
  fs.mkdirSync(Path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, serialized);

  return { path: relativePath, sha256: sha256Hex(serialized) };
};

/**
 * Write the manifest as a pretty, key-sorted `index.json`. Pretty-printing keeps
 * it human-diffable; key sorting (and the absence of any timestamp) makes it
 * byte-identical across runs for the same schema.
 */
export const writeIndex = (bundleDir: string, manifest: IndexManifest): string => {
  const indexPath = Path.join(bundleDir, 'index.json');
  // Round-trip through JSON to obtain a plain JsonObject for deterministic serialization.
  const asJson: JsonObject = JSON.parse(JSON.stringify(manifest));
  fs.mkdirSync(Path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(indexPath, `${stableStringify(asJson, true)}\n`);
  return indexPath;
};
