/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, type TypeOf } from '@kbn/config-schema';

const TestFileFtrConfigSchema = schema.object(
  {
    license: schema.maybe(schema.string()),
    kbnServerArgs: schema.maybe(schema.arrayOf(schema.string())),
    productTypes: schema.maybe(
      // TODO:PT write validate function to ensure that only the correct combinations are used
      schema.arrayOf(
        schema.object({
          product_line: schema.oneOf([
            schema.literal('security'),
            schema.literal('endpoint'),
            schema.literal('cloud'),
          ]),

          product_tier: schema.oneOf([schema.literal('essentials'), schema.literal('complete')]),
        })
      )
    ),
  },
  { defaultValue: {}, unknowns: 'forbid' }
);

export type SecuritySolutionDescribeBlockFtrConfig = TypeOf<typeof TestFileFtrConfigSchema>;
