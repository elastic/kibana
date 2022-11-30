/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';

const hostURISchema = schema.uri({ scheme: ['http', 'https'] });

export const tenantSchema = schema.object({
  id: schema.string(),
  config: schema.object({
    elasticsearch: schema.object({
      hosts: schema.arrayOf(hostURISchema, { minSize: 1 }),
      username: schema.maybe(schema.string()),
      password: schema.maybe(schema.string()),
      serviceAccountToken: schema.maybe(schema.string()),
      customHeaders: schema.recordOf(schema.string(), schema.string(), { defaultValue: {} }),
    }),
    i18n: schema.object({
      locale: schema.string({ defaultValue: 'en' }),
    }),
  }),
});

export const multitenancyConfigSchema = schema.object({
  tenants: schema.arrayOf(tenantSchema, { defaultValue: [] }),
});

export type MultitenancyConfigType = TypeOf<typeof multitenancyConfigSchema>;

export const multitenancyConfig: ServiceConfigDescriptor<MultitenancyConfigType> = {
  path: 'multitenancy',
  schema: multitenancyConfigSchema,
  deprecations: () => [],
};
