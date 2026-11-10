/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sampleJsonSchema } from '@kbn/connector-emulate';
import { z } from '@kbn/zod/v4';
import type { ActionDefinition } from '../../connector_spec';

/**
 * `required` leaves out every optional property; `all` includes them. `boundary` includes them
 * at the schema's upper bounds (longest strings, largest numbers, fullest arrays, last enum
 * value), and `enum` takes each further enum value once, so the vendor sees every value the
 * schema allows.
 */
export type InputVariant = 'required' | 'all' | 'boundary' | 'enum';

export interface RejectedInput {
  readonly variant: InputVariant;
  readonly input: unknown;
  /** Why the action's schema rejects it, e.g. a refinement the JSON Schema can't express. */
  readonly message: string;
}

export interface GeneratedInputs {
  /** Inputs the action's schema accepts, in variant order, without duplicates. */
  readonly inputs: readonly unknown[];
  readonly rejected: readonly RejectedInput[];
}

type JsonSchema = Parameters<typeof sampleJsonSchema>[0];

interface Sampling {
  readonly variant: InputVariant;
  readonly schema: JsonSchema;
  readonly options: Parameters<typeof sampleJsonSchema>[1];
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The length of the longest `enum` anywhere in a schema. */
const widestEnum = (node: unknown): number => {
  if (Array.isArray(node)) {
    return Math.max(0, ...node.map(widestEnum));
  }
  if (!isPlainObject(node)) {
    return 0;
  }
  const own = Array.isArray(node.enum) ? node.enum.length : 0;
  return Math.max(own, ...Object.values(node).map(widestEnum));
};

const UNION_KEYS = ['anyOf', 'oneOf'] as const;

/** The members of a union that have an `enum` somewhere in them, which a sample has to choose. */
const enumBranches = (union: unknown): unknown[] =>
  Array.isArray(union) ? union.filter((branch) => widestEnum(branch) > 0) : [];

/** The most members with an `enum` that any one union in a schema has. */
const widestUnion = (node: unknown): number => {
  if (Array.isArray(node)) {
    return Math.max(0, ...node.map(widestUnion));
  }
  if (!isPlainObject(node)) {
    return 0;
  }
  const own = Math.max(0, ...UNION_KEYS.map((key) => enumBranches(node[key]).length));
  return Math.max(own, ...Object.values(node).map(widestUnion));
};

/**
 * Narrows every union that has `enum`s in its members to the one at `index`, or its last one when
 * it has fewer, since the sampler always takes a union's first member.
 */
const pickBranches = (node: unknown, index: number): unknown => {
  if (Array.isArray(node)) {
    return node.map((child) => pickBranches(child, index));
  }
  if (!isPlainObject(node)) {
    return node;
  }
  const picked: Record<string, unknown> = Object.fromEntries(
    Object.entries(node).map(([key, child]) => [key, pickBranches(child, index)])
  );
  for (const key of UNION_KEYS) {
    const branches = enumBranches(picked[key]);
    if (branches.length > 0) {
      picked[key] = [branches[Math.min(index, branches.length - 1)]];
    }
  }
  return picked;
};

/**
 * Narrows every `enum` to its value at `index`, or its last one when it has fewer. The `default`
 * and `examples` the sampler would prefer are dropped from it and from everything that holds it,
 * such as an array of enum values with a default.
 */
const pickEnumValues = (node: unknown, index: number): unknown => {
  if (Array.isArray(node)) {
    return node.map((child) => pickEnumValues(child, index));
  }
  if (!isPlainObject(node)) {
    return node;
  }
  const { enum: values, ...rest } = node;
  const children = Object.fromEntries(
    Object.entries(rest).map(([key, child]) => [key, pickEnumValues(child, index)])
  );
  const holdsEnum = Array.isArray(values) ? values.length > 0 : widestEnum(children) > 0;
  if (!holdsEnum) {
    return values === undefined ? children : { ...children, enum: values };
  }
  const narrowed = Object.fromEntries(
    Object.entries(children).filter(([key]) => key !== 'default' && key !== 'examples')
  );
  return Array.isArray(values)
    ? { ...narrowed, enum: [values[Math.min(index, values.length - 1)]] }
    : narrowed;
};

/** Each enum value once, in every member of a union that has enums, so the vendor sees them all. */
const enumSamplingsOf = (schema: JsonSchema): Sampling[] =>
  Array.from({ length: Math.max(1, widestUnion(schema)) }).flatMap((_, branch) => {
    const branched = pickBranches(schema, branch);
    return Array.from({ length: widestEnum(branched) }, (__, index) => ({
      variant: 'enum' as const,
      schema: pickEnumValues(branched, index) as JsonSchema,
      options: { optional: 'all' as const },
    }));
  });

const samplingsOf = (schema: JsonSchema): Sampling[] => [
  { variant: 'required', schema, options: { optional: 'required' } },
  { variant: 'all', schema, options: { optional: 'all' } },
  { variant: 'boundary', schema, options: { optional: 'all', boundary: true } },
  ...enumSamplingsOf(schema),
];

/** Merges an override into a sampled input: objects key by key, other values replaced. */
export const mergeInput = (sampled: unknown, override: unknown): unknown => {
  if (override === undefined) {
    return sampled;
  }
  if (!isPlainObject(sampled) || !isPlainObject(override)) {
    return override;
  }
  const merged: Record<string, unknown> = { ...sampled };
  for (const [key, value] of Object.entries(override)) {
    merged[key] = mergeInput(sampled[key], value);
  }
  return merged;
};

/**
 * Generates inputs for an action from its zod `input` schema: without optional properties, with
 * them, at the schema's upper bounds and with each enum value, each with `override` merged in,
 * kept when the schema accepts them.
 */
export const generateActionInputs = async (
  { input: schema }: Pick<ActionDefinition, 'input'>,
  override?: unknown
): Promise<GeneratedInputs> => {
  const jsonSchema = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });
  const seen = new Set<string>();
  const inputs: unknown[] = [];
  const rejected: RejectedInput[] = [];
  for (const { variant, schema: sampled, options } of samplingsOf(jsonSchema)) {
    const input = mergeInput(sampleJsonSchema(sampled, options), override);
    const key = JSON.stringify(input);
    if (!seen.has(key)) {
      seen.add(key);
      const result = await schema.safeParseAsync(input);
      if (result.success) {
        inputs.push(input);
      } else {
        rejected.push({ variant, input, message: z.prettifyError(result.error) });
      }
    }
  }
  return { inputs, rejected };
};
