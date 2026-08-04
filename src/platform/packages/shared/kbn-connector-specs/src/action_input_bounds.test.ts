/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Enforces the repo-wide schema-bounding rule (see the "Schema validation" section of
 * `CLAUDE.md` / `AGENTS.md`) structurally, for every connector action input schema:
 * every `z.string()` needs a `.max()` (or an inherently bounded format), and every
 * `z.array()` / `z.record()` needs an element/entry-count cap, so oversized inputs are
 * rejected at the connector-execute HTTP boundary instead of being forwarded upstream.
 *
 * PR reviews kept re-flagging exactly this, one connector at a time (Sentry #281136,
 * Grafana #281141, Rootly #281142 — twice, PostHog #281149, Buildkite #281927), because
 * the rule only lived in prose. This test makes the whole class fail locally (and in CI)
 * before a reviewer ever sees the diff.
 *
 * Records can't express an entry-count cap natively in zod, so the convention (from the
 * Buildkite review round) is a `.refine()`/`.check()` guarding `Object.keys(v).length`;
 * any custom check on the record therefore counts as its bound, alongside a bounded key
 * schema. `z.unknown()` record/object *values* are allowed — bounding the entry count and
 * key length is what keeps those tractable.
 */

import * as connectorsSpecs from './all_specs';
import type { ConnectorSpec } from './connector_spec';
import { KNOWN_UNBOUNDED_ACTION_INPUTS } from './action_input_bounds_baseline';

const allSpecs = Object.entries(connectorsSpecs) as Array<[string, ConnectorSpec]>;

/**
 * String formats whose grammar itself bounds the value length, making an explicit
 * `.max()` redundant. `regex` is deliberately NOT here: an anchored pattern like
 * `/^\d+$/` still accepts arbitrarily long input.
 */
const BOUNDED_STRING_FORMATS = new Set([
  'uuid',
  'guid',
  'nanoid',
  'cuid',
  'cuid2',
  'ulid',
  'xid',
  'ksuid',
  'ipv4',
  'ipv6',
  'cidrv4',
  'cidrv6',
  'mac',
  'date',
  'time',
  'datetime',
  'duration',
  'e164',
]);

interface ZodDefLike {
  type?: string;
  format?: string;
  checks?: unknown[];
  innerType?: unknown;
  element?: unknown;
  keyType?: unknown;
  valueType?: unknown;
  shape?: Record<string, unknown>;
  catchall?: unknown;
  options?: unknown[];
  left?: unknown;
  right?: unknown;
  items?: unknown[];
  rest?: unknown;
  in?: unknown;
  getter?: () => unknown;
}

function getDef(schema: unknown): ZodDefLike | null {
  if (schema === null || typeof schema !== 'object') return null;
  const zodInternals = (schema as { _zod?: { def?: ZodDefLike } })._zod;
  return zodInternals?.def ?? null;
}

function getCheckKinds(def: ZodDefLike): Array<{ check?: string; format?: string }> {
  return (def.checks ?? []).map((check) => {
    const checkDef = getDef(check);
    return { check: checkDef?.check as string | undefined, format: checkDef?.format };
  });
}

function isStringBounded(def: ZodDefLike): boolean {
  if (def.format && BOUNDED_STRING_FORMATS.has(def.format)) return true;
  return getCheckKinds(def).some(
    ({ check, format }) =>
      check === 'max_length' ||
      check === 'length_equals' ||
      (check === 'string_format' && format !== undefined && BOUNDED_STRING_FORMATS.has(format))
  );
}

function hasLengthCap(def: ZodDefLike): boolean {
  return getCheckKinds(def).some(
    ({ check }) => check === 'max_length' || check === 'length_equals' || check === 'max_size'
  );
}

function hasCustomCheck(def: ZodDefLike): boolean {
  return getCheckKinds(def).some(({ check }) => check === 'custom');
}

/** Types that carry no unbounded payload and need no recursion. */
const LEAF_TYPES = new Set([
  'number',
  'int',
  'boolean',
  'bigint',
  'date',
  'enum',
  'literal',
  'null',
  'undefined',
  'void',
  'never',
  'nan',
  'any',
  'unknown',
  'transform',
  'success',
]);

/** Wrapper types whose validation semantics live entirely on `innerType`. */
const WRAPPER_TYPES = new Set([
  'optional',
  'nullable',
  'default',
  'prefault',
  'nonoptional',
  'readonly',
  'catch',
]);

function isBoundedKeyType(keySchema: unknown): boolean {
  const def = getDef(keySchema);
  if (!def) return false;
  if (def.type === 'enum' || def.type === 'literal') return true;
  if (def.type === 'string') return isStringBounded(def);
  return false;
}

/**
 * Walks an action input schema and collects one human-readable violation per unbounded
 * string / array / record found. `path` is a dotted trail from the action input root.
 */
function collectUnboundedInputs(
  schema: unknown,
  path: string,
  violations: string[],
  visited: Set<unknown>
): void {
  const def = getDef(schema);
  if (!def || !def.type) return;
  if (visited.has(def)) return;
  visited.add(def);

  const { type } = def;

  if (LEAF_TYPES.has(type)) return;

  if (WRAPPER_TYPES.has(type)) {
    collectUnboundedInputs(def.innerType, path, violations, visited);
    return;
  }

  switch (type) {
    case 'string':
      if (!isStringBounded(def)) {
        violations.push(`${path}: unbounded z.string() — add .max(n) (or a bounded format)`);
      }
      return;

    case 'array':
      if (!hasLengthCap(def) && !hasCustomCheck(def)) {
        violations.push(`${path}: unbounded z.array() — add .max(n) on the element count`);
      }
      collectUnboundedInputs(def.element, `${path}[]`, violations, visited);
      return;

    case 'set':
      if (!hasLengthCap(def) && !hasCustomCheck(def)) {
        violations.push(`${path}: unbounded z.set() — add .max(n) on the entry count`);
      }
      collectUnboundedInputs(def.valueType, `${path}[]`, violations, visited);
      return;

    case 'record':
    case 'map':
      if (!isBoundedKeyType(def.keyType)) {
        violations.push(`${path}: record key is an unbounded string — bound it with .max(n)`);
      }
      if (!hasCustomCheck(def) && getDef(def.keyType)?.type === 'string') {
        violations.push(
          `${path}: record entry count is unbounded — add .refine((v) => Object.keys(v).length <= n, ...)`
        );
      }
      collectUnboundedInputs(def.valueType, `${path}.<value>`, violations, visited);
      return;

    case 'object': {
      const shape = def.shape ?? {};
      for (const [key, propertySchema] of Object.entries(shape)) {
        collectUnboundedInputs(propertySchema, `${path}.${key}`, violations, visited);
      }
      const catchallDef = getDef(def.catchall);
      if (catchallDef && catchallDef.type !== 'never') {
        violations.push(
          `${path}: loose object (catchall/passthrough) accepts unbounded extra keys — use a bounded z.record() or a strict object`
        );
      }
      return;
    }

    case 'union':
      for (const [index, option] of (def.options ?? []).entries()) {
        collectUnboundedInputs(option, `${path}|${index}`, violations, visited);
      }
      return;

    case 'intersection':
      collectUnboundedInputs(def.left, `${path}`, violations, visited);
      collectUnboundedInputs(def.right, `${path}`, violations, visited);
      return;

    case 'tuple':
      for (const [index, item] of (def.items ?? []).entries()) {
        collectUnboundedInputs(item, `${path}.${index}`, violations, visited);
      }
      if (def.rest) {
        // Tuples with a rest element accept unbounded extra items, like an uncapped array.
        if (!hasLengthCap(def) && !hasCustomCheck(def)) {
          violations.push(`${path}: tuple rest element is unbounded — cap the total length`);
        }
        collectUnboundedInputs(def.rest, `${path}[]`, violations, visited);
      }
      return;

    case 'pipe':
      // For input validation only the `in` side matters (`out` is the transform target).
      collectUnboundedInputs(def.in, path, violations, visited);
      return;

    case 'lazy':
      collectUnboundedInputs(def.getter?.(), path, violations, visited);
      return;

    default:
      violations.push(
        `${path}: unhandled zod type "${type}" — teach action_input_bounds.test.ts how to check it`
      );
  }
}

function collectSpecViolations(exportName: string, spec: ConnectorSpec): string[] {
  const violations: string[] = [];
  for (const [actionName, action] of Object.entries(spec.actions)) {
    collectUnboundedInputs(action.input, `${actionName}.input`, violations, new Set());
  }
  return violations.map((violation) => `${exportName}: ${violation}`);
}

describe('connector action input schemas are bounded', () => {
  const allViolations = allSpecs.flatMap(([exportName, spec]) =>
    collectSpecViolations(exportName, spec)
  );

  it('introduces no new unbounded action inputs', () => {
    const baseline = new Set(KNOWN_UNBOUNDED_ACTION_INPUTS);
    const newViolations = allViolations.filter((violation) => !baseline.has(violation));
    // If this fails: bound the schema (add `.max()` / an entry-count `.refine()`), don't add a
    // baseline entry. The baseline exists only to grandfather specs that predate this test.
    expect(newViolations).toEqual([]);
  });

  it('keeps the grandfathered baseline pruned', () => {
    const current = new Set(allViolations);
    const staleBaselineEntries = KNOWN_UNBOUNDED_ACTION_INPUTS.filter(
      (entry) => !current.has(entry)
    );
    // If this fails: you fixed (or removed) a grandfathered unbounded input — great. Delete its
    // entry from KNOWN_UNBOUNDED_ACTION_INPUTS so it can't regress.
    expect(staleBaselineEntries).toEqual([]);
  });
});
