/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sha256 } from 'js-sha256';
import type { FS, LiquidOptions } from 'liquidjs';
import { Liquid } from 'liquidjs';

/**
 * LiquidJS tags supported in workflow templates.
 * Tags not in this set are removed from the engine.
 */
export const LIQUID_ALLOWED_TAGS = new Set([
  'assign',
  'for',
  'capture',
  'case',
  'comment',
  'decrement',
  'increment',
  'cycle',
  'if',
  'unless',
  'break',
  'continue',
  'raw',
  'echo',
  'liquid',
  '#',
]);

/**
 * A no-op filesystem implementation for the LiquidJS engine.
 * Workflow templates do not support file operations.
 */
const noopFs: FS = {
  exists: async () => false,
  existsSync: () => false,
  readFile: async (filepath: string) => {
    throw new Error(
      `File reading is not supported in workflow templates. Attempted to read: ${filepath}`
    );
  },
  readFileSync: (filepath: string) => {
    throw new Error(
      `File reading is not supported in workflow templates. Attempted to read: ${filepath}`
    );
  },
  resolve: (_dir: string, file: string, _ext: string) => file,
  contains: async () => false,
};

/**
 * Removes unsupported tags from a LiquidJS engine instance.
 * Any tag not in {@link LIQUID_ALLOWED_TAGS} is deleted, causing
 * LiquidJS to treat it as an unknown tag (parse error).
 */
const removeDisallowedLiquidTags = (engine: Liquid): void => {
  for (const tagName of Object.keys(engine.tags)) {
    if (!LIQUID_ALLOWED_TAGS.has(tagName)) {
      delete engine.tags[tagName];
    }
  }
};

/**
 * Coerces a value into the canonical UTF-8 string the `sha256` filter
 * hashes. Strings hash verbatim; numbers and booleans round-trip through
 * `String()`; `null` / `undefined` hash the empty string (deterministic,
 * distinct from any non-empty input); everything else (arrays / objects)
 * round-trips through `JSON.stringify` so structurally-equal inputs
 * produce equal digests.
 *
 * `JSON.stringify` is intentionally NOT key-sorted — workflow templates
 * typically hash response bodies (which arrive as strings) and never
 * synthesize object literals on the fly. If a future caller needs a
 * key-stable hash for object inputs they can `| json` first, but the
 * default keeps the filter cheap and predictable for the dominant
 * "hash this fetched body" use case.
 */
const coerceToHashable = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    // Circular references — fall back to the loose string coercion rather
    // than throwing. A `[object Object]` digest is collision-prone but it
    // is at least deterministic for the same shape, which is what callers
    // using sha256 for dedup care about.
    return String(value);
  }
};

/**
 * Registers the filters the workflow Liquid dialect adds on top of the
 * built-in LiquidJS set. Currently:
 *
 *   - `sha256`: returns the lowercase hex SHA-256 digest of the input.
 *     Used by workflows that need a deterministic dedup fingerprint for
 *     externally-fetched content (e.g. the threat-intelligence
 *     `source_ingestion` workflow's `content_fingerprint`). Pure-JS
 *     implementation via `js-sha256` so the engine stays isomorphic
 *     (`shared-common` package).
 */
const registerWorkflowFilters = (engine: Liquid): void => {
  engine.registerFilter('sha256', (value: unknown) => sha256(coerceToHashable(value)));
};

/**
 * Creates a LiquidJS engine configured for workflow templates.
 * Uses an in-memory filesystem, restricts tags to the supported set,
 * and enables ownPropertyOnly.
 *
 * Callers can pass additional {@link LiquidOptions} (e.g. `strictFilters`)
 * which are merged with the enforced defaults.
 */
export const createWorkflowLiquidEngine = (options?: LiquidOptions): Liquid => {
  const engine = new Liquid({
    ...options,
    // Only expose own properties of objects in templates (no prototype chain access)
    ownPropertyOnly: true,
    // Use a no-op filesystem as files are not supported in workflow templates
    fs: noopFs,
    // Disable relative references since file operations are not supported
    relativeReference: false,
    // Use an empty in-memory template store
    templates: {},
    // Max total characters allowed in a single parse() call (150k)
    parseLimit: 150_000,
    // Max time in ms allowed for a single render() call (1s)
    renderLimit: 1_000,
    // Max object allocations (array ops, string ops) per render (15M)
    memoryLimit: 15_000_000,
  });
  removeDisallowedLiquidTags(engine);
  registerWorkflowFilters(engine);
  return engine;
};
