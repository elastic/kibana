/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicContract } from '@kbn/utility-types';
import type { PluginInitializerContext } from '@kbn/core/public';
import type { VisualizationsSetup, VisualizationsStart } from './plugin';
import { VisualizationsPlugin } from './plugin';
import type { VisualizeEmbeddable } from './legacy/embeddable';

export function plugin(initializerContext: PluginInitializerContext) {
  return new VisualizationsPlugin(initializerContext);
}

/** @public static code */
export { TypesService } from './vis_types/types_service';
export { VIS_EVENT_TO_TRIGGER } from './embeddable/events';
export { apiHasVisualizeConfig } from './embeddable/interfaces/has_visualize_config';
export { getVisSchemas } from './vis_schemas';
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
  BasicVisualizationClient,
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
export type { SavedVisState } from '../common';

export type { IEditorController, EditorRenderProps } from './visualize_app/types';

export {
  ACTION_CONVERT_TO_LENS,
  ACTION_CONVERT_AGG_BASED_TO_LENS,
  ACTION_CONVERT_DASHBOARD_PANEL_TO_LENS,
} from './triggers';

export const getConvertToLensModule = async () => {
  return await import('./convert_to_lens');
};
export { getDataViewByIndexPatternId } from './convert_to_lens/datasource';

export {
  toTableListViewSavedObject,
  type VisualizeUserContent,
} from './utils/to_table_list_view_saved_object';
