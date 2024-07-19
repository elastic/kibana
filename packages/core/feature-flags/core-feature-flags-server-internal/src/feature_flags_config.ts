/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
import { schema, TypeOf } from '@kbn/config-schema';

const configSchema = schema.object({
  overrides: schema.maybe(schema.recordOf(schema.string(), schema.any())),
});

export type FeatureFlagsConfig = TypeOf<typeof configSchema>;

export const featureFlagsConfig: ServiceConfigDescriptor = {
  path: 'feature_flags',
  schema: configSchema,
};
