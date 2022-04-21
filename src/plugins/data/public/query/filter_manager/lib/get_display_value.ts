/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Filter } from '../../../../common';
import { DataView, DataViewField } from '../../../../../data_views/public';
import { getIndexPatternFromFilter } from './get_index_pattern_from_filter';

function getValueFormatter(indexPattern?: DataView, key?: string) {
  // checking getFormatterForField exists because there is at least once case where an index pattern
  // is an object rather than an IndexPattern class
  if (!indexPattern || !indexPattern.getFormatterForField || !key) return;

  const field = indexPattern.fields.find((f: DataViewField) => f.name === key);
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

export function getDisplayValueFromFilter(filter: Filter, indexPatterns: DataView[]): string {
  const { key, value } = filter.meta;
  if (typeof value === 'function') {
    const indexPattern = getIndexPatternFromFilter(filter, indexPatterns);
    const valueFormatter = getValueFormatter(indexPattern, key);
    // TODO: distinguish between FilterMeta which is serializable to mapped FilterMeta
    // Where value can be a function.
    return (value as any)(valueFormatter);
  } else {
    return value || '';
  }
}
