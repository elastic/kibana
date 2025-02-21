/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PublicContract } from '@kbn/utility-types';
import { PluginInitializerContext } from '@kbn/core/public';
import { VisualizationsPlugin, VisualizationsSetup, VisualizationsStart } from './plugin';
import type { VisualizeEmbeddable } from './legacy/embeddable';

export function plugin(initializerContext: PluginInitializerContext) {
  return new VisualizationsPlugin(initializerContext);
}

/** @public static code */
export { TypesService } from './vis_types/types_service';
export { VIS_EVENT_TO_TRIGGER } from './embeddable/events';
export { apiHasVisualizeConfig } from './embeddable/interfaces/has_visualize_config';
export { VisualizationContainer } from './components';
export { getVisSchemas } from './vis_schemas';
export { prepareLogTable } from '../common/utils/prepare_log_table';
export { XYCurveTypes } from '../common/convert_to_lens/constants';
export { urlFor, getFullPath } from './utils/url_utils';

/** @public types */
export type { VisualizationsSetup, VisualizationsStart };
export { VisGroups } from './vis_types/vis_groups_enum';
export type {
  BaseVisType,
  VisTypeAlias,
  VisTypeDefinition,
  Schema,
  ISchemas,
  VisualizationClient,
  SerializableAttributes,
} from './vis_types';
export type { VisualizeEditorInput } from './embeddable/types';
export type { Vis, SerializedVis, SerializedVisData, VisData } from './vis';
export type VisualizeEmbeddableContract = PublicContract<VisualizeEmbeddable>;
export type { SchemaConfig } from '../common/types';

export type { VisualizeInput, VisualizeEmbeddable } from './legacy/embeddable';
export type { HasVisualizeConfig } from './embeddable/interfaces/has_visualize_config';
export type { PersistedState } from './persisted_state';
export type {
  ISavedVis,
  VisSavedObject,
  VisToExpressionAst,
  VisToExpressionAstParams,
  VisEditorOptionsProps,
  GetVisOptions,
} from './types';
export type {
  VisualizationListItem,
  VisualizationStage,
} from './vis_types/vis_type_alias_registry';
export {
  SAVED_OBJECTS_LIMIT_SETTING,
  SAVED_OBJECTS_PER_PAGE_SETTING,
  LegendSize,
  LegendSizeToPixels,
  DEFAULT_LEGEND_SIZE,
  VISUALIZE_EMBEDDABLE_TYPE,
} from '../common/constants';
export type { SavedVisState, VisParams, Dimension } from '../common';
export type { ExpressionValueVisDimension } from '../common/expression_functions/vis_dimension';
export type {
  ExpressionValueXYDimension,
  DateHistogramParams,
  FakeParams,
  HistogramParams,
} from '../common/expression_functions/xy_dimension';

export type { IEditorController, EditorRenderProps } from './visualize_app/types';

export {
  VISUALIZE_EDITOR_TRIGGER,
  AGG_BASED_VISUALIZATION_TRIGGER,
  DASHBOARD_VISUALIZATION_PANEL_TRIGGER,
  ACTION_CONVERT_TO_LENS,
  ACTION_CONVERT_AGG_BASED_TO_LENS,
  ACTION_CONVERT_DASHBOARD_PANEL_TO_LENS,
} from './triggers';

export const getConvertToLensModule = async () => {
  return await import('./convert_to_lens');
};
export { getDataViewByIndexPatternId } from './convert_to_lens/datasource';
