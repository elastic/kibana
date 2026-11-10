/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { isArray, isPlainObject } from 'lodash';

/**
 * Walks the raw input and the parsed output in parallel and collects the paths of input keys
 * that the output no longer has. Array elements are compared index by index so a key kept by one
 * element (e.g. one union variant) cannot mask the same key being stripped from another.
 * Array indices are left out of the reported paths.
 */
function getExcessKeys(input: unknown, output: unknown, parentKey = '', excess: string[] = []) {
  if (isPlainObject(input) && isPlainObject(output)) {
    const outputRecord = output as Record<string, unknown>;
    Object.entries(input as Record<string, unknown>).forEach(([key, value]) => {
      const path = parentKey ? `${parentKey}.${key}` : key;
      if (!Object.prototype.hasOwnProperty.call(outputRecord, key)) {
        excess.push(path);
        return;
      }
      getExcessKeys(value, outputRecord[key], path, excess);
    });
  } else if (isArray(input) && isArray(output) && input.length === output.length) {
    input.forEach((value, index) => {
      getExcessKeys(value, output[index], parentKey, excess);
    });
  }

  return excess;
}

/**
 * Wraps a Zod schema to deeply reject any unrecognized keys in the input.
 *
 * This works by trial-parsing the input with the given schema, then comparing
 * the raw input against the parsed output, element by element for arrays.
 * Any excess keys in the input will cause validation to fail.
 *
 * The actual parsing is done by piping through the original schema, so all
 * schema-level errors are preserved.
 */
export function DeepStrict<TSchema extends z.ZodType>(schema: TSchema) {
  const checkedInputSchema = z.unknown().check((ctx) => {
    // Trial-parse to compare input vs output keys
    const result = schema.safeParse(ctx.value);

    // If the schema itself rejects the input, skip the excess key check
    // and let the pipe's second stage produce the proper schema errors.
    if (!result.success) {
      return;
    }

    const excessKeys = Array.from(new Set(getExcessKeys(ctx.value, result.data)));

    if (excessKeys.length) {
      // Zod >=4.5 pipes do not abort on `unrecognized_keys`; unions drop forwarded issues.
      ctx.issues.push({
        code: 'custom',
        params: { keys: excessKeys },
        input: ctx.value,
        message: `Excess keys are not allowed`,
      });
    }
  }) as z.ZodType<z.input<TSchema>>;
  const outputSchema = schema as z.ZodType<z.output<TSchema>, z.input<TSchema>>;

  return z.pipe<typeof checkedInputSchema, typeof outputSchema>(checkedInputSchema, outputSchema);
}
