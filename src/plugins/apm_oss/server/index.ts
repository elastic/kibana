/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
