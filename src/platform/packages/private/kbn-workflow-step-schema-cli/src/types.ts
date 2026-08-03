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
 * the code independent of any validator library.
 */
export type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
export interface JsonObject {
  [key: string]: JsonValue;
}

/** The two published, strictly-nested variants: `strict` ⊂ `template`. */
export const VARIANTS = ['strict', 'template'] as const;
export type VariantName = (typeof VARIANTS)[number];

export interface VariantManifest {
  /** Path to the variant document, relative to the bundle root (dir with `index.json`). */
  path: string;
  /** sha256 of the exact bytes served (minified, key-sorted `schema.json`). */
  sha256: string;
}

export interface IndexManifest {
  kibanaVersion: string;
  buildHash: string;
  profile: 'superset';
  channel: string;
  /** Sorted connector type ids from `GET /api/workflows/connectors`. */
  connectorTypes: string[];
  /** Sorted step `type` discriminators present in the produced schema. */
  stepTypes: string[];
  /** Sorted trigger `type` discriminators present in the produced schema. */
  triggerTypes: string[];
  variants: Record<VariantName, VariantManifest>;
}
