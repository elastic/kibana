/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChunkRole, JsonObject, JsonValue } from './types';
import { getDefinitionsKey } from './measure';

export interface ChunkPiece {
  /** Path relative to the variant directory (e.g. `root.json`, `defs/foo.json`). */
  relativePath: string;
  role: ChunkRole;
  /** Original definitions-map key for `def`/`step` pieces. */
  name?: string;
  content: JsonObject;
}

export interface ChunkResult {
  defsKey: string | undefined;
  pieces: ChunkPiece[];
}

const asObject = (value: JsonValue | undefined): JsonObject | undefined =>
  value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)
    ? value
    : undefined;

/** Filesystem-safe chunk filename; dots are preserved (`kibana.createCase.json`). */
const sanitize = (name: string): string => name.replace(/[^a-zA-Z0-9._-]/g, '_');

/**
 * A definition is treated as a step/connector branch (for the browsable
 * `steps/` view) when it, or its transform-added `anyOf[0]`, is an object with a
 * `type` discriminator carrying a `const` (or single-value `enum`).
 */
const detectStepType = (def: JsonObject): string | undefined => {
  const candidates: JsonObject[] = [def];
  const anyOf = def.anyOf;
  if (Array.isArray(anyOf)) {
    const firstBranch = asObject(anyOf[0]);
    if (firstBranch) {
      candidates.push(firstBranch);
    }
  }

  for (const candidate of candidates) {
    const properties = asObject(candidate.properties);
    const typeSchema = asObject(properties?.type);
    if (!typeSchema) {
      continue;
    }
    if (typeof typeSchema.const === 'string') {
      return typeSchema.const;
    }
    if (Array.isArray(typeSchema.enum) && typeSchema.enum.length === 1) {
      const single = typeSchema.enum[0];
      if (typeof single === 'string') {
        return single;
      }
    }
  }
  return undefined;
};

/**
 * Split a variant document into `root` + `def`/`step` chunks. Internal `$ref`
 * pointers are left untouched so they resolve once the definitions map is
 * reassembled. Deterministic ordering: root first, then definition chunks
 * sorted by original key.
 */
export const chunkVariant = (doc: JsonObject): ChunkResult => {
  const defsKey = getDefinitionsKey(doc);
  const defs = defsKey ? asObject(doc[defsKey]) : undefined;

  const root: JsonObject = {};
  for (const [key, value] of Object.entries(doc)) {
    if (key === defsKey) {
      continue;
    }
    root[key] = value;
  }

  const pieces: ChunkPiece[] = [{ relativePath: 'root.json', role: 'root', content: root }];

  if (defs) {
    for (const name of Object.keys(defs).sort()) {
      const content = asObject(defs[name]) ?? {};
      const stepType = detectStepType(content);
      if (stepType) {
        pieces.push({
          relativePath: `steps/${sanitize(stepType)}.json`,
          role: 'step',
          name,
          content,
        });
      } else {
        pieces.push({
          relativePath: `defs/${sanitize(name)}.json`,
          role: 'def',
          name,
          content,
        });
      }
    }
  }

  return { defsKey, pieces };
};
