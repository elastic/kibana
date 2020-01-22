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

/**
 * Visualizations Plugin - public
 *
 * This is the entry point for the entire client-side public contract of the plugin.
 * If something is not explicitly exported here, you can safely assume it is private
 * to the plugin and not considered stable.
 *
 * All stateful contracts will be injected by the platform at runtime, and are defined
 * in the setup/start interfaces in `plugin.ts`. The remaining items exported here are
 * either types, or static code.
 */

import { PluginInitializerContext } from 'src/core/public';
import { VisualizationsPlugin, VisualizationsSetup, VisualizationsStart } from './plugin';

/** @public */
export { VisualizationsSetup, VisualizationsStart };

/** @public types */
export { VisTypeAlias, VisType } from './types';

export function plugin(initializerContext: PluginInitializerContext) {
  return new VisualizationsPlugin(initializerContext);
}

/** @public static code */
export { Vis, VisParams, VisState } from './vis';
export * from './filters';

export { Status } from './legacy/update_status';
export { buildPipeline, buildVislibDimensions, SchemaConfig } from './legacy/build_pipeline';

// @ts-ignore
export { updateOldState } from './legacy/vis_update_state';
export { calculateObjectHash } from './legacy/calculate_object_hash';
// @ts-ignore
export { createFiltersFromEvent } from './filters/vis_filters';
