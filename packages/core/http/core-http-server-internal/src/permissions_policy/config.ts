/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TypeOf, schema } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';

const configSchema = schema.object({
  report_to: schema.arrayOf(schema.string(), {
    defaultValue: [],
  }),
});

/**
 * @internal
 */
export type PermissionsPolicyConfigType = TypeOf<typeof configSchema>;

export const permissionsPolicyConfig: ServiceConfigDescriptor<PermissionsPolicyConfigType> = {
  path: 'permissionsPolicy',
  schema: configSchema,
};
