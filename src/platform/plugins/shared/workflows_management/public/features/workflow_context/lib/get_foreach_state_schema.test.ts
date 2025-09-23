/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ForEachContextSchema, StepContextSchema } from '@kbn/workflows';
import { getForeachStateSchema } from './get_foreach_state_schema';
import { expectZodSchemaEqual } from '../../../../common/lib/zod_utils';
import { z } from '@kbn/zod';

describe('getForeachStateSchema', () => {
  it('should return plain foreach state if item type is not inferable', () => {
    const stepContext = StepContextSchema;
    const foreachStateSchema = getForeachStateSchema(stepContext, {
      foreach: '{{some.path.to.items}}',
      type: 'foreach',
      name: 'foreach-step',
      steps: [],
    });
    expectZodSchemaEqual(foreachStateSchema, ForEachContextSchema);
  });

  it('should return foreach state with item type if it is possible to infer from previous step output', () => {
    const itemSchema = z.object({ name: z.string(), surname: z.string() });
    const stepContext = StepContextSchema.extend({
      steps: z.object({
        'previous-step': z.object({
          output: z.array(itemSchema),
        }),
      }),
    });
    const foreachStateSchema = getForeachStateSchema(stepContext, {
      foreach: 'steps.previous-step.output',
      type: 'foreach',
      name: 'foreach-step',
      steps: [],
    });
    expectZodSchemaEqual(
      foreachStateSchema,
      ForEachContextSchema.extend({
        item: itemSchema,
        items: z.array(itemSchema),
      })
    );
  });

  it('should return foreach state with item type if it is possible to infer from consts items', () => {
    const itemSchema = z.object({ name: z.string(), surname: z.string() });
    const stepContext = StepContextSchema.extend({
      consts: z.object({
        items: z.array(itemSchema),
      }),
    });
    const foreachStateSchema = getForeachStateSchema(stepContext, {
      foreach: 'consts.items',
      type: 'foreach',
      name: 'foreach-step',
      steps: [],
    });
    expectZodSchemaEqual(
      foreachStateSchema,
      ForEachContextSchema.extend({
        item: itemSchema,
        items: z.array(itemSchema),
      })
    );
  });

  it('should throw if infered type is not an array', () => {
    const stepContext = StepContextSchema.extend({
      consts: z.object({
        items: z.object({ name: z.string(), surname: z.string() }),
      }),
    });
    expect(() =>
      getForeachStateSchema(stepContext, {
        foreach: 'consts.items',
        type: 'foreach',
        name: 'foreach-step',
        steps: [],
      })
    ).toThrow('Foreach configuration must be an array');
  });
});
