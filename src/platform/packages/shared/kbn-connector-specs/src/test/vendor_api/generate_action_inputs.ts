/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sampleJsonSchema } from '@kbn/connector-contract-mock';
import { z } from '@kbn/zod/v4';
import type { ActionDefinition } from '../../connector_spec';

/** `required` leaves out every optional property; `all` includes them. */
export type InputVariant = 'required' | 'all';

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

const VARIANTS: readonly InputVariant[] = ['required', 'all'];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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
 * Generates inputs for an action from its zod `input` schema: one without optional properties
 * and one with them, each with `override` merged in, kept when the schema accepts them.
 */
export const generateActionInputs = async (
  { input: schema }: Pick<ActionDefinition, 'input'>,
  override?: unknown
): Promise<GeneratedInputs> => {
  const jsonSchema = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });
  const seen = new Set<string>();
  const inputs: unknown[] = [];
  const rejected: RejectedInput[] = [];
  for (const variant of VARIANTS) {
    const input = mergeInput(sampleJsonSchema(jsonSchema, { optional: variant }), override);
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
