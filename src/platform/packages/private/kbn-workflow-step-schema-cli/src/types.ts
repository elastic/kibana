/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * A JSON value. JSON Schema documents are traversed structurally, so we model
 * them as plain JSON rather than importing a schema-specific type - this keeps
 * the transform/chunk/reassemble code independent of any validator library.
 */
export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export interface JsonObject {
  [key: string]: JsonValue;
}

/** The two published, strictly-nested variants: `strict` ⊂ `template`. */
export const VARIANTS = ['strict', 'template'] as const;
export type VariantName = (typeof VARIANTS)[number];

/** How a variant is packaged on disk (see the "Measure first, chunk conditionally" section). */
export type ArtifactMode = 'single' | 'chunked';

/**
 * Role of a chunk within a variant:
 * - `root`: the top-level skeleton (whole document in `single` mode; document
 *   minus the definitions map in `chunked` mode).
 * - `def`: a shared subschema from the definitions map.
 * - `step`: a definition detected as a step/connector union branch (cosmetic
 *   routing for a browsable per-step view; reassembly treats it like `def`).
 */
export type ChunkRole = 'root' | 'def' | 'step';

export interface ChunkRef {
  /** Path relative to the bundle root (the directory containing `index.json`). */
  path: string;
  role: ChunkRole;
  /** Original definitions-map key; present for `def`/`step` chunks so reassembly is lossless. */
  name?: string;
  sha256: string;
}

export interface VariantManifest {
  mode: ArtifactMode;
  /** Byte length of the canonical (minified, key-sorted) document. */
  sizeBytes: number;
  /** Gzip-compressed byte length of the canonical document - what a CDN serves. */
  gzipBytes: number;
  /** sha256 of the canonical document; identical whether stored single or chunked. */
  sha256: string;
  /** Best-effort count of step union branches (informational). */
  unionBranchCount: number;
  /** Number of entries in the definitions map (informational). */
  defsCount: number;
  /** The definitions key used by this schema (`definitions` or `$defs`); set when chunked. */
  defsKey?: string;
  /** Ordered chunks; always present. In `single` mode this is a single `root` chunk. */
  chunks: ChunkRef[];
  /** Ordered chunk paths (root first) for reassembly convenience. */
  reassemblyOrder: string[];
}

export interface IndexManifest {
  kibanaVersion: string;
  buildHash: string;
  profile: 'superset';
  channel: string;
  generatedAt: string;
  /** Sorted connector type ids from `GET /api/workflows/connectors`. */
  connectorTypes: string[];
  /** Sorted step `type` discriminators present in the produced schema. */
  stepTypes: string[];
  /** Sorted trigger `type` discriminators present in the produced schema. */
  triggerTypes: string[];
  chunkThresholdBytes: number;
  variants: Record<VariantName, VariantManifest>;
}
