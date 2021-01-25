/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
export { VisualizationContainer, VisualizationNoResults } from './components';
export { getSchemas as getVisSchemas } from './legacy/build_pipeline';

/** @public types */
export { VisualizationsSetup, VisualizationsStart };
export { VisGroups } from './vis_types';
export type {
  VisTypeAlias,
  VisType,
  BaseVisTypeOptions,
  ReactVisTypeOptions,
  Schema,
  ISchemas,
} from './vis_types';
export { VisParams, SerializedVis, SerializedVisData, VisData } from './vis';
export type VisualizeEmbeddableFactoryContract = PublicContract<VisualizeEmbeddableFactory>;
export type VisualizeEmbeddableContract = PublicContract<VisualizeEmbeddable>;
export { VisualizeInput } from './embeddable';
export type ExprVis = ExprVisClass;
export { SchemaConfig, BuildPipelineParams } from './legacy/build_pipeline';
// @ts-ignore
export { updateOldState } from './legacy/vis_update_state';
export { PersistedState } from './persisted_state';
export {
  VisualizationControllerConstructor,
  VisualizationController,
  SavedVisState,
  ISavedVis,
  VisSavedObject,
  VisResponseValue,
  VisToExpressionAst,
} from './types';
export { ExprVisAPIEvents } from './expressions/vis';
export { VisualizationListItem, VisualizationStage } from './vis_types/vis_type_alias_registry';
export { VISUALIZE_ENABLE_LABS_SETTING } from '../common/constants';
