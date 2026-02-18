/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { BaseActionRequestSchema } from '../../common/base';

export const ExecuteActionRequestSchema = {
  body: schema.object({
    ...BaseActionRequestSchema,
    parameters: schema.object({
      command: schema.string({
        minLength: 1,
        validate: (value) => {
          if (!value.trim().length) {
            return 'command cannot be an empty string';
          }
        },
      }),
      /**
       * The max timeout value before the command is killed. Number represents **seconds**
       */
      timeout: schema.maybe(schema.number({ min: 1 })),
    }),
  }),
};

export type ExecuteActionRequestBody = TypeOf<typeof ExecuteActionRequestSchema.body>;
