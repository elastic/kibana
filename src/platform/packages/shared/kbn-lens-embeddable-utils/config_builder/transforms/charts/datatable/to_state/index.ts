/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DatatableVisualizationState,
  FormBasedPersistedState,
  PersistedIndexPatternLayer,
} from '@kbn/lens-common';
import type {
  DatatableConfig,
  DatatableConfigESQL,
  DatatableConfigNoESQL,
} from '../../../../schema';
import { DEFAULT_LAYER_ID } from '../../../../constants';
import { fromMetricAPItoLensState } from '../../../columns/metric';
import { getValueColumn } from '../../../columns/esql_column';
import { addLayerColumn, generateLayer } from '../../../utils';
import { fromBucketLensApiToLensState } from '../../../columns/buckets';
import { getAccessorName, inferDatatypeFromColor } from '../helpers';
import {
  METRIC_ACCESSOR_PREFIX,
  ROW_ACCESSOR_PREFIX,
  SPLIT_METRIC_BY_ACCESSOR_PREFIX,
} from '../constants';
import { buildMetricsState, buildRowsState, buildSplitMetricsByState } from './columns';
import { buildStylingState } from './styling';
import { processMetricColumnsWithReferences } from '../../utils';

export function buildFormBasedLayer(
  config: DatatableConfigNoESQL
): FormBasedPersistedState['layers'] {
  const layers: Record<string, PersistedIndexPatternLayer> = generateLayer(
    DEFAULT_LAYER_ID,
    config
  );
  const defaultLayer = layers[DEFAULT_LAYER_ID];

  // First, convert ALL metrics and collect them with their IDs
  const metricsConverted = config.metrics.map(
    (metric) => fromMetricAPItoLensState(metric, inferDatatypeFromColor(metric.color, 'number')) // Infer datatype from color config for last_value operations
  );
  const { metricColumns, referencesColumns } = processMetricColumnsWithReferences(
    metricsConverted,
    (index) => getAccessorName(METRIC_ACCESSOR_PREFIX, index),
    (index) => getAccessorName(`${METRIC_ACCESSOR_PREFIX}_ref`, index)
  );

  // Split metrics by columns must precede row columns in columnOrder so ES aggregation
  // nesting matches the Lens datatable editor (nestingOrder: split=0, rows=1).
  // fromBucketLensApiToLensState resolves rank_by.metric_index against visible metrics only.
  if (config.split_metrics_by) {
    config.split_metrics_by.forEach((splitBy, index) => {
      const bucketColumn = fromBucketLensApiToLensState(splitBy, metricColumns);
      addLayerColumn(
        defaultLayer,
        getAccessorName(SPLIT_METRIC_BY_ACCESSOR_PREFIX, index),
        bucketColumn
      );
    });
  }

  if (config.rows) {
    config.rows.forEach((row, index) => {
      const bucketColumn = fromBucketLensApiToLensState(row, metricColumns);
      addLayerColumn(defaultLayer, getAccessorName(ROW_ACCESSOR_PREFIX, index), bucketColumn);
    });
  }

  for (const { id, column } of metricColumns) {
    addLayerColumn(defaultLayer, id, column);
  }
  for (const { id, column } of referencesColumns) {
    addLayerColumn(defaultLayer, id, column);
  }

  return layers;
}

export function getValueColumns(config: DatatableConfigESQL) {
  return [
    ...(config.split_metrics_by ?? []).map((splitBy, index) =>
      getValueColumn(getAccessorName(SPLIT_METRIC_BY_ACCESSOR_PREFIX, index), splitBy)
    ),
    ...(config.rows ?? []).map((row, index) =>
      getValueColumn(
        getAccessorName(ROW_ACCESSOR_PREFIX, index),
        row,
        inferDatatypeFromColor(row.color, 'string')
      )
    ),
    ...(config.metrics ?? []).map((metric, index) =>
      getValueColumn(
        getAccessorName(METRIC_ACCESSOR_PREFIX, index),
        metric,
        inferDatatypeFromColor(metric.color, 'number'),
        true
      )
    ),
  ];
}

export function buildVisualizationState(config: DatatableConfig): DatatableVisualizationState {
  const metrics = buildMetricsState(config.metrics);
  const rows = buildRowsState(config.rows);
  const splitMetrics = buildSplitMetricsByState(config.split_metrics_by);

  return {
    layerId: DEFAULT_LAYER_ID,
    layerType: 'data',
    ...buildStylingState(config),
    columns: rows.concat(splitMetrics, metrics),
  };
}
