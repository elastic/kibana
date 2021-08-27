/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PublicContract } from '@kbn/utility-types';
import type { PluginInitializerContext } from '../../../core/public/plugins/plugin_context';
import { VisualizeEmbeddable } from './embeddable/visualize_embeddable';
import { VisualizeEmbeddableFactory } from './embeddable/visualize_embeddable_factory';
import type { VisualizationsSetup, VisualizationsStart } from './plugin';
import { VisualizationsPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new VisualizationsPlugin(initializerContext);
}

/** @public static code */
export { Dimension, prepareLogTable, SavedVisState, VisParams } from '../common';
export { VISUALIZE_ENABLE_LABS_SETTING } from '../common/constants';
export { ExpressionValueVisDimension } from '../common/expression_functions/vis_dimension';
export {
  DateHistogramParams,
  ExpressionValueXYDimension,
  FakeParams,
  HistogramParams,
} from '../common/expression_functions/xy_dimension';
export { VisualizationContainer } from './components';
export { VisualizeInput, VISUALIZE_EMBEDDABLE_TYPE, VIS_EVENT_TO_TRIGGER } from './embeddable';
export { updateOldState } from './legacy/vis_update_state';
export type { PersistedState } from './persisted_state';
export {
  ISavedVis,
  VisEditorOptionsProps,
  VisSavedObject,
  VisToExpressionAst,
  VisToExpressionAstParams,
} from './types';
export type { SerializedVis, SerializedVisData, Vis, VisData } from './vis';
export { getVisSchemas, SchemaConfig } from './vis_schemas';
export type { BaseVisType, ISchemas, Schema, VisTypeAlias, VisTypeDefinition } from './vis_types';
export { TypesService } from './vis_types/types_service';
export { VisGroups } from './vis_types/vis_groups_enum';
export { VisualizationListItem, VisualizationStage } from './vis_types/vis_type_alias_registry';
/** @public types */
export { VisualizationsSetup, VisualizationsStart };

export type VisualizeEmbeddableFactoryContract = PublicContract<VisualizeEmbeddableFactory>;
export type VisualizeEmbeddableContract = PublicContract<VisualizeEmbeddable>;
