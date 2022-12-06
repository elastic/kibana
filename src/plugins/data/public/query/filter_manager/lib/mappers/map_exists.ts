/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type ExistsFilter, type Filter, FILTERS, isExistsFilter } from '@kbn/es-query';
import { FieldFormat } from '@kbn/field-formats-plugin/common';

export const mapExists = (filter: Filter) => {
  if (isExistsFilter(filter)) {
    return {
      type: FILTERS.EXISTS,
      value: FILTERS.EXISTS,
      key: filter.meta.params.field,
      params: filter.meta.params,
    };
  }
  throw filter;
};

export function getExistsDisplayValue(filter: ExistsFilter, formatter?: FieldFormat) {
  const value = filter.meta.params.field ?? filter.meta.value;
  return formatter?.convert(value) ?? `${value}` ?? '';
}
