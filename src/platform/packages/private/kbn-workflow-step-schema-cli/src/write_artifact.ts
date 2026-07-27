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
import type { ChunkRef, IndexManifest, JsonObject, VariantManifest, VariantName } from './types';
import {
  countDefinitions,
  countStepUnionBranches,
  getDefinitionsKey,
  measureDocument,
  sha256Hex,
  stableStringify,
} from './measure';
import { chunkVariant } from './chunk';

const writeJsonFile = (absolutePath: string, content: JsonObject): void => {
  fs.mkdirSync(Path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${stableStringify(content, true)}\n`);
};

export interface WriteVariantOptions {
  /** Absolute bundle directory: `<output-dir>/<kibanaVersion>/<channel>`. */
  bundleDir: string;
  variant: VariantName;
  doc: JsonObject;
  /** Gzip threshold at/above which the variant is chunked. */
  chunkThresholdBytes: number;
}

/**
 * Emit a single variant to disk and return its manifest entry. Single-file when
 * below the threshold (or when there is nothing to chunk), chunked otherwise.
 */
export const writeVariant = ({
  bundleDir,
  variant,
  doc,
  chunkThresholdBytes,
}: WriteVariantOptions): VariantManifest => {
  const metrics = measureDocument(doc);
  const defsCount = countDefinitions(doc);
  const unionBranchCount = countStepUnionBranches(doc);
  const defsKey = getDefinitionsKey(doc);

  const shouldChunk = metrics.gzipBytes >= chunkThresholdBytes && !!defsKey && defsCount > 0;

  if (!shouldChunk) {
    const relativePath = `${variant}/schema.json`;
    writeJsonFile(Path.join(bundleDir, relativePath), doc);
    const rootChunk: ChunkRef = { path: relativePath, role: 'root', sha256: metrics.sha256 };
    return {
      mode: 'single',
      sizeBytes: metrics.sizeBytes,
      gzipBytes: metrics.gzipBytes,
      sha256: metrics.sha256,
      unionBranchCount,
      defsCount,
      chunks: [rootChunk],
      reassemblyOrder: [relativePath],
    };
  }

  const { defsKey: chunkDefsKey, pieces } = chunkVariant(doc);
  const chunks: ChunkRef[] = pieces.map((piece) => {
    const relativePath = `${variant}/${piece.relativePath}`;
    writeJsonFile(Path.join(bundleDir, relativePath), piece.content);
    return {
      path: relativePath,
      role: piece.role,
      ...(piece.name ? { name: piece.name } : {}),
      sha256: sha256Hex(stableStringify(piece.content, false)),
    };
  });

  return {
    mode: 'chunked',
    sizeBytes: metrics.sizeBytes,
    gzipBytes: metrics.gzipBytes,
    sha256: metrics.sha256,
    unionBranchCount,
    defsCount,
    ...(chunkDefsKey ? { defsKey: chunkDefsKey } : {}),
    chunks,
    reassemblyOrder: chunks.map((chunk) => chunk.path),
  };
};

export const writeIndex = (bundleDir: string, manifest: IndexManifest): string => {
  const indexPath = Path.join(bundleDir, 'index.json');
  // Round-trip through JSON to obtain a plain JsonObject for deterministic serialization.
  const asJson: JsonObject = JSON.parse(JSON.stringify(manifest));
  writeJsonFile(indexPath, asJson);
  return indexPath;
};
