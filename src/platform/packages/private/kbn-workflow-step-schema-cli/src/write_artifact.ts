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
import type { IndexManifest, JsonObject, VariantManifest, VariantName } from './types';

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
  // Minified + key-sorted: this is exactly what is written and served.
  const serialized = stableStringify(doc, false);
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
