/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SeriesType,
  XYAnnotationLayerConfig,
  XYDataLayerConfig,
  XYLayerConfig,
  XYReferenceLineLayerConfig,
  YConfig,
} from '@kbn/lens-common';
import { getValueColumn } from '../../columns/esql_column';
import type {
  DataLayerType,
  AnnotationLayerType,
  ReferenceLineLayerType,
} from '../../../schema/charts/xy';
import { addLayerColumn, generateLayer } from '../../utils';
import {
  isAPIesqlXYLayer,
  isAPIXYLayer,
  isAPIAnnotationLayer,
  isAPIReferenceLineLayer,
  getIdForLayer,
  getAccessorNameForXY,
  isAPIDataLayer,
} from './helpers';
import { fromMetricAPItoLensState } from '../../columns/metric';
import { fromBucketLensApiToLensState } from '../../columns/buckets';
import { fromColorMappingAPIToLensState } from '../../coloring';
import { processMetricColumnsWithReferences } from '../utils';

const X_ACCESSOR = 'x';
const BREAKDOWN_ACCESSOR = 'breakdown';
const METRIC_ACCESSOR_PREFIX = 'y';
const REFERENCE_LINE_ACCESSOR_PREFIX = 'threshold';

export function getValueColumns(layer: unknown, i: number) {
  if (!isAPIXYLayer(layer) || !isAPIesqlXYLayer(layer)) {
    return [];
  }
  if (isAPIAnnotationLayer(layer)) {
    return [];
  }
  if (isAPIReferenceLineLayer(layer)) {
    return [
      ...layer.thresholds.map((t, index) =>
        getValueColumn(`referenceLine${index}`, t.column, 'number')
      ),
    ];
  }
  return [
    ...(layer.x ? [getValueColumn(getAccessorNameForXY(layer, X_ACCESSOR), layer.x.column)] : []),
    ...layer.y.map((y, index) =>
      getValueColumn(getAccessorNameForXY(layer, METRIC_ACCESSOR_PREFIX, index), y.column, 'number')
    ),
    ...(layer.breakdown_by
      ? [getValueColumn(getAccessorNameForXY(layer, BREAKDOWN_ACCESSOR), layer.breakdown_by.column)]
      : []),
  ];
}

function buildDataLayer(layer: DataLayerType, i: number): XYDataLayerConfig {
  const seriesTypeLabel = (
    layer.type.includes('percentage') ? `${layer.type}_stacked` : layer.type
  ) as SeriesType;
  const yConfig = layer.y.map<YConfig>((yMetric, index) => ({
    ...(yMetric.color?.color ? { color: yMetric.color?.color } : {}),
    ...(yMetric.axis ? { axisMode: yMetric.axis } : {}),
    forAccessor: getAccessorNameForXY(layer, METRIC_ACCESSOR_PREFIX, index),
  }));
  const meaningFulYConfig = yConfig.filter((y) => Object.values(y).length > 1);
  return {
    layerId: getIdForLayer(layer, i),
    accessors: yConfig.map(({ forAccessor }) => forAccessor),
    layerType: 'data',
    seriesType: seriesTypeLabel,
    ...(layer.x ? { xAccessor: getAccessorNameForXY(layer, X_ACCESSOR) } : {}),
    ...(meaningFulYConfig.length ? { yConfig: meaningFulYConfig } : {}),
    ...(layer.breakdown_by
      ? { splitAccessors: [getAccessorNameForXY(layer, BREAKDOWN_ACCESSOR)] }
      : {}),
    ...(layer.breakdown_by && 'collapse_by' in layer.breakdown_by
      ? { collapseFn: layer.breakdown_by.collapse_by }
      : {}),
    ...(layer.breakdown_by && 'color' in layer.breakdown_by
      ? { colorMapping: fromColorMappingAPIToLensState(layer.breakdown_by.color) }
      : {}),
  };
}

function buildAnnotationLayer(
  layer: AnnotationLayerType,
  i: number,
  dataViewId: string
): XYAnnotationLayerConfig {
  return {
    layerType: 'annotations',
    layerId: getIdForLayer(layer, i),
    indexPatternId: dataViewId,
    ignoreGlobalFilters: layer.ignore_global_filters,
    annotations: layer.events.map((annotation, index) => {
      if (annotation.type === 'range') {
        return {
          type: 'manual',
          id: `${layer.type}_event_${index}`,
          key: {
            type: 'range',
            timestamp: String(annotation.interval.from),
            endTimestamp: String(annotation.interval.to),
          },
          outside: annotation.fill === 'outside',
          color: annotation.color?.color,
          label: annotation.label ?? 'Event',
          ...(annotation.hidden != null ? { isHidden: annotation.hidden } : {}),
        };
      }
      if (annotation.type === 'point') {
        return {
          type: 'manual',
          id: `${layer.type}_event_${index}`,
          key: {
            type: 'point_in_time',
            timestamp: String(annotation.timestamp),
          },
          color: annotation.color?.color,
          label: annotation.label ?? 'Event',
          ...(annotation.hidden != null ? { isHidden: annotation.hidden } : {}),
          ...(annotation.text != null ? { textVisibility: annotation.text === 'label' } : {}),
          ...(annotation.icon ? { icon: annotation.icon } : {}),
          ...(annotation.line?.stroke_width != null
            ? { lineWidth: annotation.line.stroke_width }
            : {}),
          ...(annotation.line?.stroke_dash ? { lineStyle: annotation.line.stroke_dash } : {}),
        };
      }
      return {
        type: 'query',
        id: `${layer.type}_event_${index}`,
        filter: { type: 'kibana_query', ...annotation.query },
        label: annotation.label ?? 'Event',
        color: annotation.color?.color,
        ...(annotation.hidden != null ? { isHidden: annotation.hidden } : {}),
        timeField: annotation.time_field,
        ...(annotation.extra_fields ? { extraFields: annotation.extra_fields } : {}),
        ...(annotation.text != null ? { textVisibility: annotation.text === 'label' } : {}),
        ...(typeof annotation.text !== 'string' && annotation.text?.type === 'field'
          ? { textField: annotation.text.field }
          : {}),
        ...(annotation.icon ? { icon: annotation.icon } : {}),
        ...(annotation.line?.stroke_width != null
          ? { lineWidth: annotation.line.stroke_width }
          : {}),
        ...(annotation.line?.stroke_dash ? { lineStyle: annotation.line.stroke_dash } : {}),
        key: {
          type: 'point_in_time',
        },
      };
    }),
  };
}

function buildReferenceLineLayer(
  layer: ReferenceLineLayerType,
  i: number
): XYReferenceLineLayerConfig {
  const yConfig = layer.thresholds.map<YConfig>((threshold, index) => ({
    icon: threshold.icon,
    lineWidth: threshold.stroke_width,
    lineStyle: threshold.stroke_dash,
    textVisibility: threshold.text ? threshold.text === 'label' : undefined,
    fill: threshold.fill,
    color: threshold.color?.color,
    axisMode: threshold.axis,
    forAccessor: getAccessorNameForXY(layer, REFERENCE_LINE_ACCESSOR_PREFIX, index),
  }));
  return {
    layerType: 'referenceLine',
    layerId: getIdForLayer(layer, i),
    yConfig,
    accessors: yConfig.map(({ forAccessor }) => forAccessor),
  };
}

export function buildXYLayer(
  layer: unknown,
  i: number,
  dataViewId: string
): XYLayerConfig | undefined {
  if (!isAPIXYLayer(layer)) {
    return;
  }

  // now enrich the layer based on its type
  if (isAPIAnnotationLayer(layer)) {
    return buildAnnotationLayer(layer, i, dataViewId);
  }
  if (isAPIReferenceLineLayer(layer)) {
    return buildReferenceLineLayer(layer, i);
  }
  return buildDataLayer(layer, i);
}

export function buildFormBasedXYLayer(layer: unknown, i: number) {
  // annotation layer have no datasource state
  if (!isAPIXYLayer(layer) || isAPIesqlXYLayer(layer) || isAPIAnnotationLayer(layer)) {
    return {};
  }
  const layerId = getIdForLayer(layer, i);
  const datasource = generateLayer(layerId, layer);

  const newLayer = datasource[layerId];

  if (isAPIReferenceLineLayer(layer)) {
    for (const [index, column] of Object.entries(layer.thresholds)) {
      const columns = fromMetricAPItoLensState(column);
      addLayerColumn(
        newLayer,
        getAccessorNameForXY(layer, REFERENCE_LINE_ACCESSOR_PREFIX, Number(index)),
        columns
      );
    }
  }

  if (isAPIDataLayer(layer)) {
    // convert metrics in buckets, do not flat yet
    const yColumnsConverted = layer.y.map(fromMetricAPItoLensState);
    const yColumnsWithIds = processMetricColumnsWithReferences(
      yColumnsConverted,
      (index) => getAccessorNameForXY(layer, METRIC_ACCESSOR_PREFIX, index),
      (index) => getAccessorNameForXY(layer, `${METRIC_ACCESSOR_PREFIX}_ref`, index)
    );
    const xColumns = layer.x ? fromBucketLensApiToLensState(layer.x, yColumnsWithIds) : undefined;
    const breakdownColumns = layer.breakdown_by
      ? fromBucketLensApiToLensState(layer.breakdown_by, yColumnsWithIds)
      : undefined;

    // Add bucketed coluns first
    if (xColumns) {
      addLayerColumn(newLayer, getAccessorNameForXY(layer, X_ACCESSOR), xColumns);
    }

    if (breakdownColumns) {
      const breakdownById = getAccessorNameForXY(layer, BREAKDOWN_ACCESSOR);
      addLayerColumn(
        newLayer,
        breakdownById,
        breakdownColumns,
        layer.breakdown_by?.aggregate_first || !layer.x
      );
    }

    // then metric ones
    for (const { id, column } of yColumnsWithIds) {
      addLayerColumn(newLayer, id, column);
    }
  }
  return datasource;
}
