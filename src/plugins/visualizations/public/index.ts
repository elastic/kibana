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

import './index.scss';

import { PublicContract } from '@kbn/utility-types';
import { PluginInitializerContext } from '../../../core/public';
import { VisualizationsPlugin, VisualizationsSetup, VisualizationsStart } from './plugin';

/** @public */
export { VisualizationsSetup, VisualizationsStart };

/** @public types */
export { VisTypeAlias, VisType } from './vis_types';
export { VisSavedObject } from './types';
export { Vis, VisParams, SerializedVis, SerializedVisData, VisData } from './vis';
import { VisualizeEmbeddableFactory, VisualizeEmbeddable } from './embeddable';
export type VisualizeEmbeddableFactoryContract = PublicContract<VisualizeEmbeddableFactory>;
export type VisualizeEmbeddableContract = PublicContract<VisualizeEmbeddable>;
export { TypesService } from './vis_types/types_service';
export { VISUALIZE_EMBEDDABLE_TYPE, VisualizeInput } from './embeddable';
export { SchemaConfig } from './legacy/build_pipeline';
export { ExprVis } from './expressions/vis';

export function plugin(initializerContext: PluginInitializerContext) {
  return new VisualizationsPlugin(initializerContext);
}

export { VisualizationsPlugin as Plugin };
export * from './plugin';
export * from './types';

export { PersistedState } from './persisted_state';
