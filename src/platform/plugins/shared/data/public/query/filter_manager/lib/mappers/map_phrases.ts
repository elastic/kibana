/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Filter, PhrasesFilter, isPhrasesFilter } from '@kbn/es-query';
import { FieldFormat } from '@kbn/field-formats-plugin/common';

export function getPhrasesDisplayValue(filter: PhrasesFilter, formatter?: FieldFormat) {
  return filter.meta.params
    .map((v) => {
      return formatter?.convert(v) ?? v;
    })
    .join(', ');
}

export const mapPhrases = (filter: Filter) => {
  if (!isPhrasesFilter(filter)) {
    throw filter;
  }

  const { type, key, params } = filter.meta;

  return {
    type,
    key,
    value: params,
    params,
  };
};
