/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginInitializerContext } from '../../../core/server';
import { APMOSSPlugin } from './plugin';

export const config = {
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    transactionIndices: schema.string({ defaultValue: 'apm-*' }),
    spanIndices: schema.string({ defaultValue: 'apm-*' }),
    errorIndices: schema.string({ defaultValue: 'apm-*' }),
    metricsIndices: schema.string({ defaultValue: 'apm-*' }),
    sourcemapIndices: schema.string({ defaultValue: 'apm-*' }),
    onboardingIndices: schema.string({ defaultValue: 'apm-*' }),
    indexPattern: schema.string({ defaultValue: 'apm-*' }),
    fleetMode: schema.boolean({ defaultValue: true }),
  }),
};

export function plugin(initializerContext: PluginInitializerContext) {
  return new APMOSSPlugin(initializerContext);
}

export type APMOSSConfig = TypeOf<typeof config.schema>;

export { APMOSSPluginSetup } from './plugin';
