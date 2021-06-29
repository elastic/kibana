/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublicContract } from '@kbn/utility-types';
import { PluginInitializerContext } from 'src/core/public';
import { VisualizationsPlugin, VisualizationsSetup, VisualizationsStart } from './plugin';
import type { VisualizeEmbeddableFactory, VisualizeEmbeddable } from './embeddable';

export function plugin(initializerContext: PluginInitializerContext) {
  return new VisualizationsPlugin(initializerContext);
}

/** @public static code */
export { TypesService } from './vis_types/types_service';
export { VISUALIZE_EMBEDDABLE_TYPE, VIS_EVENT_TO_TRIGGER } from './embeddable';
export { VisualizationContainer } from './components';
export { getVisSchemas } from './vis_schemas';

/** @public types */
export { VisualizationsSetup, VisualizationsStart };
export { VisGroups } from './vis_types/vis_groups_enum';
export type { BaseVisType, VisTypeAlias, VisTypeDefinition, Schema, ISchemas } from './vis_types';
export type { Vis, SerializedVis, SerializedVisData, VisData } from './vis';
export type VisualizeEmbeddableFactoryContract = PublicContract<VisualizeEmbeddableFactory>;
export type VisualizeEmbeddableContract = PublicContract<VisualizeEmbeddable>;
export { VisualizeInput } from './embeddable';
export { SchemaConfig } from './vis_schemas';
export { updateOldState } from './legacy/vis_update_state';
export type { PersistedState } from './persisted_state';
export {
  ISavedVis,
  VisSavedObject,
  VisToExpressionAst,
  VisToExpressionAstParams,
  VisEditorOptionsProps,
} from './types';
export { VisualizationListItem, VisualizationStage } from './vis_types/vis_type_alias_registry';
export { VISUALIZE_ENABLE_LABS_SETTING } from '../common/constants';
export { SavedVisState, VisParams } from '../common';
export { ExpressionValueVisDimension } from './expression_functions/vis_dimension';
