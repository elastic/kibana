/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { IIndexPattern } from '../..';
import { getIndexPatternFromFilter } from './get_index_pattern_from_filter';
import { Filter } from '../filters';

function getValueFormatter(indexPattern?: IIndexPattern, key?: string) {
  // checking getFormatterForField exists because there is at least once case where an index pattern
  // is an object rather than an IndexPattern class
  if (!indexPattern || !indexPattern.getFormatterForField || !key) return;

  const field = indexPattern.fields.find((f) => f.name === key);
  if (!field) {
    throw new Error(
      i18n.translate('data.filter.filterBar.fieldNotFound', {
        defaultMessage: 'Field {key} not found in index pattern {indexPattern}',
        values: { key, indexPattern: indexPattern.title },
      })
    );
  }
  return indexPattern.getFormatterForField(field);
}

export function getDisplayValueFromFilter(filter: Filter, indexPatterns: IIndexPattern[]): string {
  if (typeof filter.meta.value === 'function') {
    const indexPattern = getIndexPatternFromFilter(filter, indexPatterns);
    const valueFormatter: any = getValueFormatter(indexPattern, filter.meta.key);
    return (filter.meta.value as any)(valueFormatter);
  } else {
    return filter.meta.value || '';
  }
}
