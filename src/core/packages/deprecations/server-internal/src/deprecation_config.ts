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

const configSchema = schema.object({
  // `deprecation.skip_deprecated_settings` is consistent with the equivalent ES feature and config property
  skip_deprecated_settings: schema.arrayOf(schema.string(), { defaultValue: [] }),
  enable_http_debug_logs: schema.boolean({ defaultValue: false }),
});

export type DeprecationConfigType = TypeOf<typeof configSchema>;

export const config: ServiceConfigDescriptor<DeprecationConfigType> = {
  path: 'deprecation',
  schema: configSchema,
};
