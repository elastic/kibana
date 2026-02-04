/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pickBy } from 'lodash';

import type {
  FormBasedLayer,
  GaugeVisualizationState,
  MetricVisualizationState,
  TextBasedLayer,
} from '@kbn/lens-common';

import type { LensAttributes } from '../../types';
import type { LensApiState } from '../../schema';
import { buildReferences, getAdhocDataviews, isTextBasedLayer, nonNullable } from '../utils';
import { LENS_LAYER_SUFFIX } from '../constants';
import type { APIAdHocDataView, APIDataView } from '../columns/types';
import type { AnyMetricLensStateColumn } from '../columns/types';

export function getSharedChartLensStateToAPI(
  config: Pick<LensAttributes, 'title' | 'description'>
): Pick<LensApiState, 'title' | 'description'> {
  return {
    // @TODO: need to make this optional in LensDocument type
    title: config.title ?? '',
    ...(config.description != null ? { description: config.description } : {}),
  };
}

export function getSharedChartAPIToLensState(config: { title?: string; description?: string }) {
  return {
    // @TODO: need to make this optional in LensDocument type
    title: config.title ?? '',
    ...(config.description != null ? { description: config.description } : {}),
  };
}

export function getMetricAccessor(
  visualization: GaugeVisualizationState | MetricVisualizationState
) {
  // @ts-expect-error Unfortunately for some obscure reasons there are SO out there with the accessor property instead of the correct one
  return visualization.metricAccessor ?? visualization.accessor;
}

export function getDatasourceLayers(
  state: LensAttributes['state']
): Record<string, Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer> {
  const formBasedLayers = state.datasourceStates.formBased?.layers;
  const textBasedLayers = state.datasourceStates.textBased?.layers;
  // @ts-expect-error unfortunately due to a migration bug, some existing SO might still have the old indexpattern DS state
  const indexPatternLayers = state.datasourceStates.indexpattern?.layers;
  // Charts can have mixed layer types, so collect them all together
  return {
    ...(formBasedLayers && Object.keys(formBasedLayers).length ? formBasedLayers : {}),
    ...(textBasedLayers && Object.keys(textBasedLayers).length ? textBasedLayers : {}),
    ...(indexPatternLayers && Object.keys(indexPatternLayers).length ? indexPatternLayers : {}),
  };
}

export function getLensStateLayer(
  layers: Record<string, Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer>,
  visLayerId: string | undefined
) {
  // Filter to keep non-linked layers (layers without linkToLayers or with linkToLayers set to null)
  // Also keep ES|QL layers with non-empty columns, as old layers persist after chart type switches and have empty columns
  const mainLayers = Object.entries(layers).filter(
    ([, l]) =>
      !('linkToLayers' in l) ||
      l.linkToLayers == null ||
      (isTextBasedLayer(l) && l.columns.length > 0)
  );

  const visLayer = visLayerId ? mainLayers.find(([id, l]) => id === visLayerId) : undefined;

  return visLayer ?? mainLayers[0];
}

type OptionalProperties<T extends Record<string, any> | undefined> = Pick<
  T,
  { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T]
>;

/**
 * Strips out undefined properties from an object.
 *
 * Pass only properties that can be undefined.
 */
export function stripUndefined<T extends Record<string, any> | undefined>(
  obj: OptionalProperties<T>
): OptionalProperties<T> {
  return pickBy(obj, nonNullable) as OptionalProperties<T>;
}

export function getDataViewsMetadata(
  usedDataviews: Record<string, APIDataView | APIAdHocDataView>
) {
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
  const references = regularDataViews.length ? buildReferences(regularDataViewsMap) : [];

  return { adHocDataViews, internalReferences, references, dataViewLayerToIdMap };
}

/**
 * Processes converted metric columns and their optional reference columns,
 * assigning IDs.
 */
export function processMetricColumnsWithReferences<T extends AnyMetricLensStateColumn>(
  convertedMetrics: T[][],
  getAccessorName: (index: number) => string,
  getRefAccessorName: (index: number) => string
): Array<{ column: T; id: string }> {
  const result: Array<{ column: T; id: string }> = [];

  for (const [index, convertedColumns] of Object.entries(convertedMetrics)) {
    const [mainMetric, refMetric] = convertedColumns;
    const id = getAccessorName(Number(index));
    result.push({ column: mainMetric, id });

    if (refMetric) {
      // Use a different format for reference column ids
      // as visualization doesn't know about them, so wrong id could be generated on that side
      const refId = getRefAccessorName(Number(index));
      // Rewrite the main metric's reference to match the new ID
      if ('references' in mainMetric && Array.isArray(mainMetric.references)) {
        mainMetric.references = [refId];
      }
      result.push({ column: refMetric, id: refId });
    }
  }

  return result;
}
