/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { get, isPlainObject } from 'lodash';
import { Filter, FilterMeta } from './meta_filter';
import { IIndexPattern, IFieldType } from '../../index_patterns';

export type PhraseFilterMeta = FilterMeta & {
  params?: {
    query: string; // The unformatted value
  };
  field?: any;
  index?: any;
};

export type PhraseFilter = Filter & {
  meta: PhraseFilterMeta;
  script?: {
    script: {
      source?: any;
      lang?: string;
      params: any;
    };
  };
};

type PhraseFilterValue = string | number | boolean;

export const isPhraseFilter = (filter: any): filter is PhraseFilter => {
  const isMatchPhraseQuery = filter && filter.query && filter.query.match_phrase;

  const isDeprecatedMatchPhraseQuery =
    filter &&
    filter.query &&
    filter.query.match &&
    Object.values(filter.query.match).find((params: any) => params.type === 'phrase');

  return Boolean(isMatchPhraseQuery || isDeprecatedMatchPhraseQuery);
};

export const isScriptedPhraseFilter = (filter: any): filter is PhraseFilter =>
  Boolean(get(filter, 'script.script.params.value'));

export const getPhraseFilterField = (filter: PhraseFilter) => {
  const queryConfig = filter.query.match_phrase || filter.query.match;
  return Object.keys(queryConfig)[0];
};

export const getPhraseFilterValue = (filter: PhraseFilter): PhraseFilterValue => {
  const queryConfig = filter.query.match_phrase || filter.query.match;
  const queryValue = Object.values(queryConfig)[0] as any;
  return isPlainObject(queryValue) ? queryValue.query : queryValue;
};

export const buildPhraseFilter = (
  field: IFieldType,
  value: any,
  indexPattern: IIndexPattern
): PhraseFilter => {
  const convertedValue = getConvertedValueForField(field, value);

  if (field.scripted) {
    return {
      meta: { index: indexPattern.id, field: field.name } as PhraseFilterMeta,
      script: getPhraseScript(field, value),
    };
  } else {
    return {
      meta: { index: indexPattern.id },
      query: {
        match_phrase: {
          [field.name]: convertedValue,
        },
      },
    } as PhraseFilter;
  }
};

export const getPhraseScript = (field: IFieldType, value: string) => {
  const convertedValue = getConvertedValueForField(field, value);
  const script = buildInlineScriptForPhraseFilter(field);

  return {
    script: {
      source: script,
      lang: field.lang,
      params: {
        value: convertedValue,
      },
    },
  };
};

// See https://github.com/elastic/elasticsearch/issues/20941 and https://github.com/elastic/kibana/issues/8677
// and https://github.com/elastic/elasticsearch/pull/22201
// for the reason behind this change. Aggs now return boolean buckets with a key of 1 or 0.
export const getConvertedValueForField = (field: IFieldType, value: any) => {
  if (typeof value !== 'boolean' && field.type === 'boolean') {
    if ([1, 'true'].includes(value)) {
      return true;
    } else if ([0, 'false'].includes(value)) {
      return false;
    } else {
      throw new Error(`${value} is not a valid boolean value for boolean field ${field.name}`);
    }
  }
  return value;
};

/**
 * Takes a scripted field and returns an inline script appropriate for use in a script query.
 * Handles lucene expression and Painless scripts. Other langs aren't guaranteed to generate valid
 * scripts.
 *
 * @param {object} scriptedField A Field object representing a scripted field
 * @returns {string} The inline script string
 */
export const buildInlineScriptForPhraseFilter = (scriptedField: any) => {
  // We must wrap painless scripts in a lambda in case they're more than a simple expression
  if (scriptedField.lang === 'painless') {
    return (
      `boolean compare(Supplier s, def v) {return s.get() == v;}` +
      `compare(() -> { ${scriptedField.script} }, params.value);`
    );
  } else {
    return `(${scriptedField.script}) == value`;
  }
};
