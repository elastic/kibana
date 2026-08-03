/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypedLensSerializedState, XYPersistedState } from '@kbn/lens-common';
import { LENS_ITEM_LATEST_VERSION } from '@kbn/lens-common/content_management/constants';
import type { SavedObjectReference } from '@kbn/core/server';
import type { XYConfig } from '../../schema';
import {
  getSharedChartLensStateToAPI,
  getSharedChartAPIToLensState,
  getDatasourceLayers,
} from './utils';
import type { LensAttributes } from '../../types';
import {
  buildDatasourceStates,
  buildReferences,
  getAdhocDataviews,
  generateAdHocDataViewId,
  getAdHocDataViewSpec,
} from '../utils';
import type { APIAdHocDataView } from '../columns/types';
import { buildVisualizationAPI, buildVisualizationState } from './xy/chart';
import { buildFormBasedXYLayer, getValueColumns } from './xy/state_layers';
import { isAPIAnnotationLayer, getIdForLayer } from './xy/helpers';
import {
  LENS_LAYER_SUFFIX,
  LENS_XY_ANNOTATION_LAYER_SUFFIX,
  LENS_DEFAULT_TIME_FIELD,
  LENS_ESQL_ANNOTATION_DATA_VIEW_ID_SUFFIX,
} from '../constants';

type XYLens = Extract<TypedLensSerializedState['attributes'], { visualizationType: 'lnsXY' }>;
type XYLensState = Omit<XYLens['state'], 'filters' | 'query'>;

type XYLensWithoutQueryAndFilters = Omit<XYLens, 'state'> & {
  // Use XYPersistedState for visualization since the config builder works with persisted format
  state: Omit<XYLensState, 'visualization'> & { visualization: XYPersistedState };
};

const ANNOTATION_DATA_VIEW_ID_SUFFIX = LENS_ESQL_ANNOTATION_DATA_VIEW_ID_SUFFIX;

function getAnnotationDataViewId(dataView: APIAdHocDataView): string {
  return `${generateAdHocDataViewId(dataView)}${ANNOTATION_DATA_VIEW_ID_SUFFIX}`;
}

export function fromAPItoLensState(config: XYConfig): XYLensWithoutQueryAndFilters {
  // convert layers and produce references from them
  const { layers, usedDataviews } = buildDatasourceStates(
    config,
    buildFormBasedXYLayer,
    getValueColumns
  );

  // By-value annotation layers persist their data view under the
  // `xy-visualization-layer-` reference name (regular and ad hoc alike), matching
  // Lens's own persistence logic so the XY runtime can resolve it. A manual-only
  // layer carries no data view at all and emits no such reference; the runtime
  // then falls back to the first index-pattern reference at load time (see
  // x-pack/.../lens/public/visualizations/xy/persistence.ts).
  const annotationLayerIds = new Set(
    config.layers
      .map((layer, index) =>
        isAPIAnnotationLayer(layer) && !('group_id' in layer)
          ? getIdForLayer(layer, index)
          : undefined
      )
      .filter((id): id is string => id != null)
  );

  const { adHocDataViews, internalReferences } = getAdhocDataviews(
    usedDataviews,
    annotationLayerIds
  );

  const regularDataViews = Object.entries(usedDataviews).filter(
    (v): v is [string, { id: string; type: 'dataView' }] => v[1].type === 'dataView'
  );

  const regularDataViewsMap = Object.fromEntries(
    regularDataViews.map(([key, { id }]) => [key, id])
  );

  const dataViewLayerToIdMap: Record<string, string> = Object.fromEntries([
    ...Object.entries(regularDataViewsMap),
    ...internalReferences.map((ref) => {
      const layerId = ref.name.startsWith(LENS_XY_ANNOTATION_LAYER_SUFFIX)
        ? ref.name.replace(LENS_XY_ANNOTATION_LAYER_SUFFIX, '')
        : ref.name.replace(LENS_LAYER_SUFFIX, '');
      return [layerId, ref.id];
    }),
  ]);

  // Annotation layers in ES|QL charts must use a *regular* (non-ES|QL-typed) ad-hoc data view.
  // The Lens XY visualization calls getUsedDataViews() on all annotation layers before rendering
  // and tries to initialise an ES|QL text-based context when it finds a data view with
  // type: 'esql', which leaves the chart in an infinite loading state.
  // Fix: create a companion regular data view (same index + timeFieldName, no dataSourceType)
  // and route annotation layers to it so Lens handles them as a normal index-pattern context.
  const annotationLayerIndices = config.layers.reduce<number[]>((acc, layer, i) => {
    if (isAPIAnnotationLayer(layer)) acc.push(i);
    return acc;
  }, []);

  if (annotationLayerIndices.length > 0) {
    const firstEsqlDataView = Object.values(usedDataviews).find(
      (dv): dv is APIAdHocDataView =>
        dv.type === 'adHocDataView' && (dv as APIAdHocDataView).dataSourceType === 'esql'
    );

    if (firstEsqlDataView) {
      const regularDataView: APIAdHocDataView = {
        type: 'adHocDataView',
        index: firstEsqlDataView.index,
        timeFieldName: firstEsqlDataView.timeFieldName ?? LENS_DEFAULT_TIME_FIELD,
        // dataSourceType intentionally omitted — makes this a regular index-pattern data view
      };
      // Keep the companion data view distinct from the ES|QL data view when both resolve to
      // the same index + time field id.
      const annotationDataViewId = getAnnotationDataViewId(regularDataView);
      const annotationDataViewSpec = {
        ...getAdHocDataViewSpec(regularDataView),
        id: annotationDataViewId,
      };

      adHocDataViews[annotationDataViewId] = annotationDataViewSpec;

      const annotationLayerRefsMap = Object.fromEntries(
        annotationLayerIndices.map((i) => [getIdForLayer(config.layers[i], i), annotationDataViewId])
      );

      Object.assign(dataViewLayerToIdMap, annotationLayerRefsMap);

      internalReferences.push(...buildReferences(annotationLayerRefsMap, annotationLayerIds));
    }
  }

  const annotationGroupReferences: SavedObjectReference[] = [];

  const visualizationState = buildVisualizationState(
    config,
    dataViewLayerToIdMap,
    annotationGroupReferences
  );

  const references = [
    ...annotationGroupReferences,
    ...buildReferences(regularDataViewsMap, annotationLayerIds),
  ];

  return {
    visualizationType: 'lnsXY',
    version: LENS_ITEM_LATEST_VERSION,
    ...getSharedChartAPIToLensState(config),
    state: {
      datasourceStates: layers,
      ...(internalReferences.length ? { internalReferences } : {}),
      visualization: visualizationState,
      adHocDataViews,
    },
    references,
  };
}

export function fromLensStateToAPI(config: LensAttributes): XYConfig {
  const { state } = config;
  const visualizationState = state.visualization as XYPersistedState;
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
