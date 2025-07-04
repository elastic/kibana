/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import {
  Filter,
  isPhraseFilter,
  isPhrasesFilter,
  isRangeFilter,
  isScriptedPhraseFilter,
  isScriptedRangeFilter,
  getFilterField,
  DataViewBase,
  DataViewFieldBase,
} from '@kbn/es-query';
import { getPhraseDisplayValue } from './mappers/map_phrase';
import { getPhrasesDisplayValue } from './mappers/map_phrases';
import { getRangeDisplayValue } from './mappers/map_range';
import { getIndexPatternFromFilter } from './get_index_pattern_from_filter';

function getValueFormatter(indexPattern?: DataViewBase | DataView, key?: string) {
  // checking getFormatterForField exists because there is at least once case where an index pattern
  // is an object rather than an IndexPattern class
  if (!indexPattern || !('getFormatterForField' in indexPattern) || !key) return;

  const field = indexPattern.fields.find((f) => f.name === key);
  if (!field) {
    throw new Error(
      i18n.translate('data.filter.filterBar.fieldNotFound', {
        defaultMessage: 'Field {key} not found in data view {dataView}',
        values: { key, dataView: indexPattern.title },
      })
    );
  }
  return indexPattern.getFormatterForField(field);
}

export function getFieldDisplayValueFromFilter(
  filter: Filter,
  indexPatterns: DataView[] | DataViewBase[]
): string {
  const indexPattern = getIndexPatternFromFilter<DataView | DataViewBase>(filter, indexPatterns);
  if (!indexPattern) return '';

  const fieldName = getFilterField(filter);
  if (!fieldName) return '';

  const field = indexPattern.fields.find(
    (f: DataViewFieldBase | DataViewField) => f.name === fieldName
  );

  return field && 'customLabel' in field ? (field as DataViewField).customLabel ?? '' : '';
}

export function getDisplayValueFromFilter(filter: Filter, indexPatterns: DataViewBase[]): string {
  const indexPattern = getIndexPatternFromFilter(filter, indexPatterns);
  const fieldName = getFilterField(filter);
  const field = indexPattern?.fields.find((f) => f.name === fieldName);
  const fieldType = field?.type;
  const valueFormatter = getValueFormatter(indexPattern, fieldName);

  if (isPhraseFilter(filter) || isScriptedPhraseFilter(filter)) {
    return getPhraseDisplayValue(filter, valueFormatter, fieldType);
  } else if (isPhrasesFilter(filter)) {
    return getPhrasesDisplayValue(filter, valueFormatter);
  } else if (isRangeFilter(filter) || isScriptedRangeFilter(filter)) {
    return getRangeDisplayValue(filter, valueFormatter);
  } else return filter.meta.value ?? '';
}
