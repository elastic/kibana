/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export type ApmConfigSchema = TypeOf<typeof apmConfigSchema>;

const apmReusableConfigSchema = schema.object(
  {
    active: schema.maybe(schema.boolean()),
    serverUrl: schema.maybe(schema.uri()),
    secretToken: schema.maybe(schema.string()),
    apiKey: schema.maybe(schema.string()),
    environment: schema.maybe(schema.string()),
    globalLabels: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  },
  { unknowns: 'allow' }
);

export const apmConfigSchema = apmReusableConfigSchema.extends({
  servicesOverrides: schema.maybe(schema.recordOf(schema.string(), apmReusableConfigSchema)),
  redactUsers: schema.maybe(schema.boolean({ defaultValue: true })),
});
