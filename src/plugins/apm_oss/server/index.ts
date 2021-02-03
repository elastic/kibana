/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import apmIndexPattern from './tutorial/index_pattern.json';
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
  }),
};

export function plugin(initializerContext: PluginInitializerContext) {
  return new APMOSSPlugin(initializerContext);
}

export type APMOSSConfig = TypeOf<typeof config.schema>;

export { APMOSSPluginSetup } from './plugin';

export { apmIndexPattern };

export { APM_STATIC_INDEX_PATTERN_ID } from '../common/index_pattern_constants';

export {
  createNodeAgentInstructions,
  createDjangoAgentInstructions,
  createFlaskAgentInstructions,
  createRailsAgentInstructions,
  createRackAgentInstructions,
  createJsAgentInstructions,
  createGoAgentInstructions,
  createJavaAgentInstructions,
  createDotNetAgentInstructions,
} from './tutorial/instructions/apm_agent_instructions';
