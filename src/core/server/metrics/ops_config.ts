/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const opsConfig = {
  path: 'ops',
  schema: schema.object({
    interval: schema.duration({ defaultValue: '5s' }),
    cGroupOverrides: schema.object({
      cpuPath: schema.maybe(schema.string()),
      cpuAcctPath: schema.maybe(schema.string()),
    }),
  }),
};

export type OpsConfigType = TypeOf<typeof opsConfig.schema>;
