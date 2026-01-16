/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { FormBasedLayer, DatatableVisualizationState, TextBasedLayer } from '@kbn/lens-common';
import type { SavedObjectReference } from '@kbn/core/server';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { DatatableState } from '../../../../schema';
import {
  buildDatasetStateESQL,
  buildDatasetStateNoESQL,
  generateApiLayer,
  isTextBasedLayer,
} from '../../../utils';
import { convertAppearanceToAPIFormat } from './appearance';
import { convertDatatableColumnsToAPI } from './columns';

export function buildVisualizationAPI(
  visualization: DatatableVisualizationState,
  layer: Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer,
  layerId: string,
  adHocDataViews: Record<string, DataViewSpec>,
  references: SavedObjectReference[],
  adhocReferences?: SavedObjectReference[]
): DatatableState {
  if (isTextBasedLayer(layer)) {
    const dataset = buildDatasetStateESQL(layer);

    const { columnIdMapping, ...columns } = convertDatatableColumnsToAPI(layer, visualization);

    return {
      type: 'datatable',
      dataset,
      ...generateApiLayer(layer),
      ...columns,
      ...convertAppearanceToAPIFormat(visualization, columnIdMapping),
    };
  }

  const dataset = buildDatasetStateNoESQL(
    layer,
    layerId,
    adHocDataViews,
    references,
    adhocReferences
  );

  const { columnIdMapping, ...columns } = convertDatatableColumnsToAPI(layer, visualization);

  return {
    type: 'datatable',
    dataset,
    ...generateApiLayer(layer),
    ...columns,
    ...convertAppearanceToAPIFormat(visualization, columnIdMapping),
  };
}
