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

import { PublicContract } from '@kbn/utility-types';
import { PluginInitializerContext } from 'src/core/public';
import { VisualizationsPlugin, VisualizationsSetup, VisualizationsStart } from './plugin';
import { VisualizeEmbeddableFactory, VisualizeEmbeddable } from './embeddable';
import { ExprVis as ExprVisClass } from './expressions/vis';

export function plugin(initializerContext: PluginInitializerContext) {
  return new VisualizationsPlugin(initializerContext);
}

/** @public static code */
export { Vis } from './vis';
export { TypesService } from './vis_types/types_service';
export { VISUALIZE_EMBEDDABLE_TYPE, VIS_EVENT_TO_TRIGGER } from './embeddable';

/** @public types */
export { VisualizationsSetup, VisualizationsStart };
export { VisTypeAlias, VisType } from './vis_types';
export { VisParams, SerializedVis, SerializedVisData, VisData } from './vis';
export type VisualizeEmbeddableFactoryContract = PublicContract<VisualizeEmbeddableFactory>;
export type VisualizeEmbeddableContract = PublicContract<VisualizeEmbeddable>;
export { VisualizeInput } from './embeddable';
export type ExprVis = ExprVisClass;
export { SchemaConfig } from './legacy/build_pipeline';
// @ts-ignore
export { updateOldState } from './legacy/vis_update_state';
export { PersistedState } from './persisted_state';
export {
  VisualizationController,
  SavedVisState,
  ISavedVis,
  VisSavedObject,
  VisResponseValue,
} from './types';
export { VisualizationListItem } from './vis_types/vis_type_alias_registry';
export { VISUALIZE_ENABLE_LABS_SETTING } from '../common/constants';
