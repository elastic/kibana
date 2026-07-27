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
import type { IndexManifest, JsonObject, VariantManifest, VariantName } from './types';
import {
  countDefinitions,
  countStepUnionBranches,
  measureDocument,
  stableStringify,
} from './measure';

const writeJsonFile = (absolutePath: string, content: JsonObject): void => {
  fs.mkdirSync(Path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${stableStringify(content, true)}\n`);
};

export interface WriteVariantOptions {
  /** Absolute bundle directory: `<output-dir>/<kibanaVersion>/<channel>`. */
  bundleDir: string;
  variant: VariantName;
  doc: JsonObject;
}

/**
 * Emit a variant as a single self-contained `<variant>/schema.json` and return
 * its manifest entry. (Chunking was removed while artifacts sit well under any
 * practical size threshold; the measured sizes are still recorded so it can be
 * re-introduced from data later.)
 */
export const writeVariant = ({ bundleDir, variant, doc }: WriteVariantOptions): VariantManifest => {
  const metrics = measureDocument(doc);
  const defsCount = countDefinitions(doc);
  const unionBranchCount = countStepUnionBranches(doc);

  const relativePath = `${variant}/schema.json`;
  writeJsonFile(Path.join(bundleDir, relativePath), doc);

  return {
    path: relativePath,
    sizeBytes: metrics.sizeBytes,
    gzipBytes: metrics.gzipBytes,
    sha256: metrics.sha256,
    unionBranchCount,
    defsCount,
  };
};

export const writeIndex = (bundleDir: string, manifest: IndexManifest): string => {
  const indexPath = Path.join(bundleDir, 'index.json');
  // Round-trip through JSON to obtain a plain JsonObject for deterministic serialization.
  const asJson: JsonObject = JSON.parse(JSON.stringify(manifest));
  writeJsonFile(indexPath, asJson);
  return indexPath;
};
