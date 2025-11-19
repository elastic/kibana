/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypedLensSerializedState, XYState as XYStateLens } from '@kbn/lens-common';
import type { XYState } from '../../schema';
import {
  getSharedChartLensStateToAPI,
  getSharedChartAPIToLensState,
  getDatasourceLayers,
} from './utils';
import type { LensAttributes } from '../../types';
import { buildDatasourceStates, buildReferences, getAdhocDataviews } from '../utils';
import { buildVisualizationAPI, buildVisualizationState } from './xy/chart';
import { buildFormBasedXYLayer, getValueColumns } from './xy/state_layers';
import { LENS_LAYER_SUFFIX } from '../constants';

type XYLens = Extract<TypedLensSerializedState['attributes'], { visualizationType: 'lnsXY' }>;
type XYLensState = Omit<XYLens['state'], 'filters' | 'query'>;

type XYLensWithoutQueryAndFilters = Omit<XYLens, 'state'> & { state: XYLensState };

export function fromAPItoLensState(config: XYState): XYLensWithoutQueryAndFilters {
  // convert layers and produce references from them
  const { layers, usedDataviews } = buildDatasourceStates(
    config,
    buildFormBasedXYLayer,
    getValueColumns
  );

  const { adHocDataViews, internalReferences } = getAdhocDataviews(usedDataviews);

  const regularDataViews = Object.entries(usedDataviews).filter(
    (v): v is [string, { id: string; type: 'dataView' }] => v[1].type === 'dataView'
  );

  const regularDataViewsMap = Object.fromEntries(
    regularDataViews.map(([key, { id }]) => [key, id])
  );
  // merge both internal references and regularDataViews into a single map { layerId => dataViewId }
  const dataViewLayerToIdMap: Record<string, string> = Object.fromEntries([
    ...Object.entries(regularDataViewsMap).map(([layerId, dataViewId]) => [layerId, dataViewId]),
    ...internalReferences.map((ref) => [ref.name.replace(LENS_LAYER_SUFFIX, ''), ref.id]),
  ]);
  const visualizationState = buildVisualizationState(config, dataViewLayerToIdMap);
  // @TODO: support annotation references
  const references = regularDataViews.length ? buildReferences(regularDataViewsMap) : [];

  return {
    visualizationType: 'lnsXY',
    ...getSharedChartAPIToLensState(config),
    state: {
      datasourceStates: layers,
      ...(internalReferences.length ? { internalReferences } : {}),
      visualization: visualizationState,
      ...(Object.keys(adHocDataViews).length ? { adHocDataViews } : {}),
    },
    references,
  };
}

export function fromLensStateToAPI(config: LensAttributes): XYState {
  const { state } = config;
  const visualizationState = state.visualization as XYStateLens;
  const layers = getDatasourceLayers(state);

  return {
    ...getSharedChartLensStateToAPI(config),
    ...buildVisualizationAPI(
      visualizationState,
      layers,
      config.state.adHocDataViews ?? {},
      config.references,
      config.state.internalReferences ?? []
    ),
  };
}
