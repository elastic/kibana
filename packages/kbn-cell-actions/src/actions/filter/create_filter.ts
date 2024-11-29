/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  BooleanRelation,
  FILTERS,
  type CombinedFilter,
  type ExistsFilter,
  type PhraseFilter,
  type Filter,
} from '@kbn/es-query';
import type { DefaultActionsSupportedValue } from '../types';

export const createExistsFilter = ({
  key,
  negate,
  dataViewId,
}: {
  key: string;
  negate: boolean;
  dataViewId?: string;
}): ExistsFilter => ({
  meta: { key, negate, type: FILTERS.EXISTS, value: 'exists', index: dataViewId },
  query: { exists: { field: key } },
});

const createPhraseFilter = ({
  key,
  negate,
  value,
  dataViewId,
}: {
  value: string | number | boolean;
  key: string;
  negate?: boolean;
  dataViewId?: string;
}): PhraseFilter => ({
  meta: {
    index: dataViewId,
    key,
    negate,
    type: FILTERS.PHRASE,
    params: { query: value.toString() },
  },
  query: { match_phrase: { [key]: { query: value.toString() } } },
});

const createCombinedFilter = ({
  values,
  key,
  negate,
  dataViewId,
}: {
  values: DefaultActionsSupportedValue;
  key: string;
  negate: boolean;
  dataViewId?: string;
}): CombinedFilter => ({
  meta: {
    index: dataViewId,
    key,
    negate,
    type: FILTERS.COMBINED,
    relation: BooleanRelation.AND,
    params: values.map((value) => createPhraseFilter({ key, value, dataViewId })),
  },
});

export const createFilter = ({
  key,
  value,
  negate,
  dataViewId,
}: {
  key: string;
  value: DefaultActionsSupportedValue;
  negate: boolean;
  dataViewId?: string;
}): Filter => {
  if (value.length === 0) {
    return createExistsFilter({ key, negate, dataViewId });
  }

  if (value.length > 1) {
    return createCombinedFilter({ key, negate, values: value, dataViewId });
  } else {
    return createPhraseFilter({ key, negate, value: value[0], dataViewId });
  }
};
