/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  BooleanRelation,
  FILTERS,
  type CombinedFilter,
  type ExistsFilter,
  type PhraseFilter,
  type Filter,
} from '@kbn/es-query';
import { DefaultActionsSupportedValue } from '../types';

export const isEmptyFilterValue = (value: Array<string | number | boolean>) =>
  value.length === 0 || value.every((v) => v === '');

const createExistsFilter = ({ key, negate }: { key: string; negate: boolean }): ExistsFilter => ({
  meta: { key, negate, type: FILTERS.EXISTS, value: 'exists' },
  query: { exists: { field: key } },
});

const createPhraseFilter = ({
  key,
  negate,
  value,
}: {
  value: string | number | boolean;
  key: string;
  negate?: boolean;
}): PhraseFilter => ({
  meta: {
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
}: {
  values: DefaultActionsSupportedValue;
  key: string;
  negate: boolean;
}): CombinedFilter => ({
  meta: {
    key,
    negate,
    type: FILTERS.COMBINED,
    relation: BooleanRelation.AND,
    params: values.map((value) => createPhraseFilter({ key, value })),
  },
});

export const createFilter = ({
  key,
  value,
  negate,
}: {
  key: string;
  value: DefaultActionsSupportedValue;
  negate: boolean;
}): Filter => {
  if (value.length === 0) {
    return createExistsFilter({ key, negate });
  }

  if (value.length > 1) {
    return createCombinedFilter({ key, negate, values: value });
  } else {
    return createPhraseFilter({ key, negate, value: value[0] });
  }
};
