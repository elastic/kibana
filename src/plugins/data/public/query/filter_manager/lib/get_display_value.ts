/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { Filter, isPhraseFilter, isPhrasesFilter, isRangeFilter } from '@kbn/es-query';
import { getPhraseDisplayValue } from './mappers/map_phrase';
import { getPhrasesDisplayValue } from './mappers/map_phrases';
import { getRangeDisplayValue } from './mappers/map_range';
import { getIndexPatternFromFilter } from './get_index_pattern_from_filter';

function getValueFormatter(indexPattern?: DataView, key?: string) {
  // checking getFormatterForField exists because there is at least once case where an index pattern
  // is an object rather than an IndexPattern class
  if (!indexPattern || !indexPattern.getFormatterForField || !key) return;

  const field = indexPattern.fields.find((f: DataViewField) => f.name === key);
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

export function getFieldDisplayValueFromFilter(filter: Filter, indexPatterns: DataView[]): string {
  const { key } = filter.meta;
  const indexPattern = getIndexPatternFromFilter(filter, indexPatterns);
  if (!indexPattern) return '';
  const field = indexPattern.fields.find((f: DataViewField) => f.name === key);
  return field?.customLabel ?? '';
}

export function getDisplayValueFromFilter(filter: Filter, indexPatterns: DataView[]): string {
  const { key, value } = filter.meta;
  const indexPattern = getIndexPatternFromFilter(filter, indexPatterns);
  let valueFormatter;
  try {
    valueFormatter = getValueFormatter(indexPattern, key);
  } catch (e) {
    // The field does not exist in this index pattern
  }

  if (isPhraseFilter(filter)) {
    return getPhraseDisplayValue(filter, valueFormatter);
  } else if (isPhrasesFilter(filter)) {
    return getPhrasesDisplayValue(filter, valueFormatter);
  } else if (isRangeFilter(filter)) {
    return getRangeDisplayValue(filter, valueFormatter);
  } else return value ?? '';
}
