/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { convertQueryToESQLExpression, sanitazeESQLInput } from '@kbn/esql-utils';
import {
  isQueryAnnotationConfig,
  type EsqlEventAnnotationConfig,
  type EventAnnotationConfig,
  type QueryPointEventAnnotationConfig,
} from '@kbn/event-annotation-common';
import type { IndexPatternMap } from '../types';
import { LENS_LAYER_TYPES } from '../visualizations/constants';

interface AnnotationLayerShape {
  layerType?: string;
  indexPatternId?: string;
  ignoreGlobalFilters?: boolean;
  annotations?: EventAnnotationConfig[];
}

/**
 * Converts DSL query annotations to ES|QL annotations that query the same index pattern.
 * Returns undefined when a layer cannot be converted without changing what it shows.
 *
 * The visualization state is probed structurally because ES|QL conversion is
 * visualization-agnostic.
 */
export const convertQueryAnnotationsToEsql = (
  visualizationState: unknown,
  indexPatterns: IndexPatternMap
): unknown | undefined => {
  const layers = (visualizationState as { layers?: unknown })?.layers;
  if (!Array.isArray(layers)) {
    return visualizationState;
  }

  const convertedLayers: unknown[] = [];
  for (const layer of layers as AnnotationLayerShape[]) {
    const queryAnnotations = layer?.annotations?.filter(isQueryAnnotationConfig) ?? [];
    if (layer?.layerType !== LENS_LAYER_TYPES.ANNOTATIONS || queryAnnotations.length === 0) {
      convertedLayers.push(layer);
      continue;
    }
    // ES|QL annotations ignore global filters, so converting would change what is shown.
    if (layer.ignoreGlobalFilters === false) {
      return undefined;
    }
    const indexPattern = layer.indexPatternId ? indexPatterns[layer.indexPatternId] : undefined;
    if (!indexPattern) {
      return undefined;
    }
    const annotations: EventAnnotationConfig[] = [];
    for (const annotation of layer.annotations ?? []) {
      if (!isQueryAnnotationConfig(annotation)) {
        annotations.push(annotation);
        continue;
      }
      const converted = toEsqlAnnotation(
        annotation,
        indexPattern.title,
        indexPattern.timeFieldName
      );
      if (!converted) {
        return undefined;
      }
      annotations.push(converted);
    }
    convertedLayers.push({ ...layer, annotations });
  }
  return { ...(visualizationState as object), layers: convertedLayers };
};

const toEsqlAnnotation = (
  annotation: QueryPointEventAnnotationConfig,
  indexPatternTitle: string,
  defaultTimeField: string | undefined
): EsqlEventAnnotationConfig | undefined => {
  const timeField = annotation.timeField || defaultTimeField;
  if (!timeField) {
    return undefined;
  }
  // The filter is unset until a newly switched query annotation receives its first query
  const condition = convertQueryToESQLExpression(annotation.filter);
  if (annotation.filter?.query && !condition) {
    return undefined;
  }
  const textField = annotation.textVisibility ? annotation.textField : undefined;
  const keptFields = [
    ...new Set([timeField, ...(textField ? [textField] : []), ...(annotation.extraFields ?? [])]),
  ];
  const query = [
    `FROM ${indexPatternTitle}`,
    ...(condition ? [`WHERE ${condition}`] : []),
    `KEEP ${keptFields.map((field) => sanitazeESQLInput(field)).join(', ')}`,
  ].join(' | ');

  const {
    id,
    key,
    label,
    color,
    isHidden,
    icon,
    lineStyle,
    lineWidth,
    textVisibility,
    extraFields,
  } = annotation;
  return {
    id,
    key,
    label,
    color,
    isHidden,
    icon,
    lineStyle,
    lineWidth,
    textVisibility,
    type: 'esql',
    query: { esql: query },
    timeField,
    timeColumn: timeField,
    ...(textField ? { textColumn: textField } : {}),
    ...(extraFields?.length ? { extraColumns: extraFields } : {}),
  };
};
