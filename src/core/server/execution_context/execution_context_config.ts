/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TypeOf, schema } from '@kbn/config-schema';
import { ServiceConfigDescriptor } from '../internal_types';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
});

/**
 * @internal
 */
export type ExecutionContextConfigType = TypeOf<typeof configSchema>;

export const config: ServiceConfigDescriptor<ExecutionContextConfigType> = {
  path: 'execution_context',
  schema: configSchema,
};
