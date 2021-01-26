/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { ServiceConfigDescriptor } from '../internal_types';

const statusConfigSchema = schema.object({
  allowAnonymous: schema.boolean({ defaultValue: false }),
});

export type StatusConfigType = TypeOf<typeof statusConfigSchema>;

export const config: ServiceConfigDescriptor<StatusConfigType> = {
  path: 'status',
  schema: statusConfigSchema,
};
