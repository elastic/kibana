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

import { PluginInitializerContext, PluginConfigDescriptor } from 'src/core/server';
import { VisTypeTimeseriesConfig, config as configSchema } from './config';
import { VisTypeTimeseriesPlugin } from './plugin';

export { VisTypeTimeseriesSetup } from './plugin';

export const config: PluginConfigDescriptor<VisTypeTimeseriesConfig> = {
  deprecations: ({ unused, renameFromRoot }) => [
    // In Kibana v7.8 plugin id was renamed from 'metrics' to 'vis_type_timeseries':
    renameFromRoot('metrics.enabled', 'vis_type_timeseries.enabled', true),
    renameFromRoot('metrics.chartResolution', 'vis_type_timeseries.chartResolution', true),
    renameFromRoot('metrics.minimumBucketSize', 'vis_type_timeseries.minimumBucketSize', true),

    // Unused properties which should be removed after releasing Kibana v8.0:
    unused('chartResolution'),
    unused('minimumBucketSize'),
  ],
  schema: configSchema,
};

export { ValidationTelemetryServiceSetup } from './validation_telemetry';

export {
  AbstractSearchStrategy,
  ReqFacade,
} from './lib/search_strategies/strategies/abstract_search_strategy';
// @ts-ignore
export { DefaultSearchCapabilities } from './lib/search_strategies/default_search_capabilities';

export function plugin(initializerContext: PluginInitializerContext) {
  return new VisTypeTimeseriesPlugin(initializerContext);
}
