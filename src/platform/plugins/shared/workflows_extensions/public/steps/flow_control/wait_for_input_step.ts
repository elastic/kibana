/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';
import { WaitForInputStepCommonDefinition } from '../../../common/steps/flow_control';
import { createPublicStepDefinition } from '../../step_registry/types';

const recordOutputSchema: z.ZodType<Record<string, unknown>> = z.record(z.string(), z.unknown());

export const WaitForInputStepDefinition = createPublicStepDefinition({
  ...WaitForInputStepCommonDefinition,
  editorHandlers: {
    dynamicSchema: {
      getOutputSchema: ({ input }) => {
        if (!input?.schema) {
          return recordOutputSchema;
        }

        try {
          const zodSchema = fromJSONSchema(input.schema as Record<string, unknown>);

          if (!zodSchema) {
            return recordOutputSchema;
          }

          return zodSchema as z.ZodType<Record<string, unknown>>;
        } catch {
          return recordOutputSchema;
        }
      },
    },
  },
});
