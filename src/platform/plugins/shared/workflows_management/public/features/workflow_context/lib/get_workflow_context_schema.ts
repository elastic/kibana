/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { WorkflowContextSchema } from '@kbn/workflows';
import { z } from '@kbn/zod';
import { inferZodType } from '../../../../common/lib/zod_utils';

export function getWorkflowContextSchema(definition: WorkflowYaml) {
  // extend the base schema with inputs, consts from the definition and event
  return WorkflowContextSchema.extend({
    inputs: z.object({
      ...Object.fromEntries(
        (definition.inputs || []).map((input) => {
          let valueSchema: z.ZodType;
          switch (input.type) {
            case 'string':
              valueSchema = z.string();
              break;
            case 'number':
              valueSchema = z.number();
              break;
            case 'boolean':
              valueSchema = z.boolean();
              break;
            case 'choice':
              const opts = input.options ?? [];
              valueSchema = z.any();
              if (opts.length > 0) {
                const literals = opts.map((o) => z.literal(o)) as [
                  z.ZodLiteral<any>,
                  z.ZodLiteral<any>,
                  ...z.ZodLiteral<any>[]
                ];
                valueSchema = z.union(literals);
              }
              break;
            default:
              valueSchema = z.any();
              break;
          }
          if (input.default) {
            valueSchema = valueSchema.default(input.default);
          }
          return [input.name, valueSchema];
        })
      ),
    }),
    consts: z.object({
      ...Object.fromEntries(
        Object.entries(definition.consts ?? {}).map(([key, value]) => [key, inferZodType(value)])
      ),
    }),
  });
}
