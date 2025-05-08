/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';

export const redisClientConfigSchema = schema.object({
  url: schema.uri({ scheme: ['redis', 'rediss'] }), // Redis connection URL (must be a valid URI with redis or rediss scheme)
});

const cacheConfigSchema = schema.object({
  client: schema.object({ redis: redisClientConfigSchema }),
});

export type CacheConfig = TypeOf<typeof cacheConfigSchema>;

export const config: ServiceConfigDescriptor<CacheConfig> = {
  path: 'cache' as const,
  schema: cacheConfigSchema,
};
