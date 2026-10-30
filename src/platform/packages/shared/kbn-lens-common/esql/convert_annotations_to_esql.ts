/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql } from '@elastic/esql';
import { getKqlFieldNamesFromExpression } from '@kbn/es-query';
import { convertQueryToESQLExpression, sanitazeESQLInput } from '@kbn/esql-utils';
import {
  isQueryAnnotationConfig,
  type EsqlEventAnnotationConfig,
  type EventAnnotationConfig,
  type QueryPointEventAnnotationConfig,
} from '@kbn/event-annotation-common';
import type { IndexPattern, IndexPatternMap } from '../types';
import { LENS_LAYER_TYPES } from '../visualizations/constants';

// Matches the implicit ES|QL default; explicit so the cap is visible and editable after conversion
export const CONVERTED_ANNOTATION_QUERY_LIMIT = 1000;

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
      const converted = toEsqlAnnotation(annotation, indexPattern);
      if (!converted) {
        return undefined;
      }
      annotations.push(converted);
    }
    convertedLayers.push({ ...layer, annotations });
  }
  return { ...(visualizationState as object), layers: convertedLayers };
};

// ES|QL only sees mapped fields; data view runtime and scripted fields would be missing columns.
const isDataViewOnlyField = (indexPattern: IndexPattern, fieldName: string): boolean => {
  const field = indexPattern.getFieldByName(fieldName);
  return Boolean(field?.runtime || field?.scripted);
};

const getDataViewOnlyFieldNames = (indexPattern: IndexPattern): string[] =>
  indexPattern.fields
    .filter((field) => isDataViewOnlyField(indexPattern, field.name))
    .map((field) => field.name);

// Unparseable KQL yields undefined, which callers treat as "cannot verify".
const getKqlFieldNamesOrUndefined = (queryText: string): string[] | undefined => {
  try {
    return getKqlFieldNamesFromExpression(queryText);
  } catch {
    return undefined;
  }
};

// KQL()/QSTR() run against index mappings, so filters on data view only fields would silently match nothing.
const filterUsesDataViewOnlyField = (
  filter: QueryPointEventAnnotationConfig['filter'] | undefined,
  indexPattern: IndexPattern
): boolean => {
  if (!filter?.query) {
    return false;
  }
  const dataViewOnlyFieldNames = getDataViewOnlyFieldNames(indexPattern);
  if (dataViewOnlyFieldNames.length === 0) {
    return false;
  }
  const queryText = typeof filter.query === 'string' ? filter.query : JSON.stringify(filter.query);
  if (filter.language === 'kuery') {
    return (
      getKqlFieldNamesOrUndefined(queryText)?.some((fieldName) =>
        dataViewOnlyFieldNames.includes(fieldName)
      ) ?? true
    );
  }
  // No Lucene field extractor is available; a substring match errs on the side of not converting.
  return dataViewOnlyFieldNames.some((fieldName) => queryText.includes(fieldName));
};

const toEsqlAnnotation = (
  annotation: QueryPointEventAnnotationConfig,
  indexPattern: IndexPattern
): EsqlEventAnnotationConfig | undefined => {
  const timeField = annotation.timeField || indexPattern.timeFieldName;
  if (!timeField) {
    return undefined;
  }
  // The filter is unset until a newly switched query annotation receives its first query
  const condition = convertQueryToESQLExpression(annotation.filter);
  if (annotation.filter?.query && !condition) {
    return undefined;
  }
  if (filterUsesDataViewOnlyField(annotation.filter, indexPattern)) {
    return undefined;
  }
  const textField = annotation.textVisibility ? annotation.textField : undefined;
  const keptFields = [
    ...new Set([timeField, ...(textField ? [textField] : []), ...(annotation.extraFields ?? [])]),
  ];
  if (keptFields.some((fieldName) => isDataViewOnlyField(indexPattern, fieldName))) {
    return undefined;
  }
  const query = [
    // Same source escaping as the data-layer conversion in generate_esql_query.ts
    `FROM ${esql.src(indexPattern.title)}`,
    ...(condition ? [`WHERE ${condition}`] : []),
    `KEEP ${keptFields.map((field) => sanitazeESQLInput(field)).join(', ')}`,
    // Newest events win when the limit truncates the result, instead of an arbitrary subset
    `SORT ${sanitazeESQLInput(timeField)} DESC`,
    `LIMIT ${CONVERTED_ANNOTATION_QUERY_LIMIT}`,
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
