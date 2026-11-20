/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';
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

// Explicit allowlist: a field added to the annotation types must be opted in here, so query-only
// fields never leak into persisted ES|QL annotations.
const SHARED_ANNOTATION_FIELDS = [
  'id',
  'key',
  'label',
  'color',
  'isHidden',
  'icon',
  'lineStyle',
  'lineWidth',
  'textVisibility',
] as const satisfies ReadonlyArray<keyof QueryPointEventAnnotationConfig>;

interface AnnotationLayerShape {
  layerType?: string;
  indexPatternId?: string;
  ignoreGlobalFilters?: boolean;
  annotations?: EventAnnotationConfig[];
}

export type AnnotationConversionFailureReason =
  | 'global_filters_not_supported'
  | 'data_view_not_found'
  | 'time_field_not_found'
  | 'filter_not_convertible'
  | 'data_view_only_field_not_supported';

export type QueryAnnotationsConversionResult =
  | { ok: true; state: unknown }
  | { ok: false; reason: AnnotationConversionFailureReason };

type LayerConversionResult =
  | { ok: true; layer: unknown }
  | { ok: false; reason: AnnotationConversionFailureReason };

type AnnotationConversionResult =
  | { ok: true; annotation: EsqlEventAnnotationConfig }
  | { ok: false; reason: AnnotationConversionFailureReason };

/**
 * Converts DSL query annotations to ES|QL annotations that query the same index pattern.
 * Fails with a reason when a layer cannot be converted without changing what it shows.
 *
 * The visualization state is probed structurally because ES|QL conversion is
 * visualization-agnostic.
 */
export const convertQueryAnnotationsToEsql = (
  visualizationState: unknown,
  indexPatterns: IndexPatternMap
): QueryAnnotationsConversionResult => {
  const layers = (visualizationState as { layers?: unknown })?.layers;
  if (!Array.isArray(layers)) {
    return { ok: true, state: visualizationState };
  }

  const convertedLayers: unknown[] = [];
  for (const layer of layers as AnnotationLayerShape[]) {
    const result = convertAnnotationLayer(layer, indexPatterns);
    if (!result.ok) {
      return result;
    }
    convertedLayers.push(result.layer);
  }
  return { ok: true, state: { ...(visualizationState as object), layers: convertedLayers } };
};

const convertAnnotationLayer = (
  layer: AnnotationLayerShape,
  indexPatterns: IndexPatternMap
): LayerConversionResult => {
  if (layer?.layerType !== LENS_LAYER_TYPES.ANNOTATIONS) {
    return { ok: true, layer };
  }

  const annotations: EventAnnotationConfig[] = [];
  let hasQueryAnnotation = false;
  for (const annotation of layer.annotations ?? []) {
    if (!isQueryAnnotationConfig(annotation)) {
      annotations.push(annotation);
      continue;
    }
    hasQueryAnnotation = true;
    // ES|QL annotations ignore global filters, so converting would change what is shown.
    if (layer.ignoreGlobalFilters === false) {
      return { ok: false, reason: 'global_filters_not_supported' };
    }
    const indexPattern = layer.indexPatternId ? indexPatterns[layer.indexPatternId] : undefined;
    if (!indexPattern) {
      return { ok: false, reason: 'data_view_not_found' };
    }
    const converted = toEsqlAnnotation(annotation, indexPattern);
    if (!converted.ok) {
      return converted;
    }
    annotations.push(converted.annotation);
  }
  return { ok: true, layer: hasQueryAnnotation ? { ...layer, annotations } : layer };
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
  // No Lucene field extractor is available, so match field names as plain substrings of the query
  // text. This errs on the side of not converting: a data view only field with a short name such as
  // `a` or `host` also blocks queries that merely contain it inside another token (for example
  // `hostname:web-1`). KQL filters are parsed and do not have this limitation.
  return dataViewOnlyFieldNames.some((fieldName) => queryText.includes(fieldName));
};

const toEsqlAnnotation = (
  annotation: QueryPointEventAnnotationConfig,
  indexPattern: IndexPattern
): AnnotationConversionResult => {
  const timeField = annotation.timeField || indexPattern.timeFieldName;
  if (!timeField) {
    return { ok: false, reason: 'time_field_not_found' };
  }
  // The filter is unset until a newly switched query annotation receives its first query
  const condition = convertQueryToESQLExpression(annotation.filter);
  if (annotation.filter?.query && !condition) {
    return { ok: false, reason: 'filter_not_convertible' };
  }
  if (filterUsesDataViewOnlyField(annotation.filter, indexPattern)) {
    return { ok: false, reason: 'data_view_only_field_not_supported' };
  }
  const textField = annotation.textVisibility ? annotation.textField : undefined;
  const keptFields = [
    ...new Set([timeField, ...(textField ? [textField] : []), ...(annotation.extraFields ?? [])]),
  ];
  if (keptFields.some((fieldName) => isDataViewOnlyField(indexPattern, fieldName))) {
    return { ok: false, reason: 'data_view_only_field_not_supported' };
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

  return {
    ok: true,
    annotation: {
      ...pick(annotation, SHARED_ANNOTATION_FIELDS),
      type: 'esql',
      query: { esql: query },
      timeField,
      timeColumn: timeField,
      ...(textField ? { textColumn: textField } : {}),
      ...(annotation.extraFields?.length ? { extraColumns: annotation.extraFields } : {}),
    },
  };
};
