/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';

const coreConfigSchema = schema.object({
  lifecycle: schema.object({
    disablePreboot: schema.boolean({ defaultValue: false }),
  }),
});

export type CoreConfigType = TypeOf<typeof coreConfigSchema>;

export const coreConfig: ServiceConfigDescriptor<CoreConfigType> = {
  path: 'core',
  schema: coreConfigSchema,
};
