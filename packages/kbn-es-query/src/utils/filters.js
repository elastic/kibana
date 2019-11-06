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

import { pick, get, reduce, map } from 'lodash';

/** @deprecated
 * @see src/plugins/data/public/es_query/filters/phrase_filter.ts
 * Code was already moved into src/plugins/data/public.
 * This method will be removed after moving 'es_query' into new platform
 * */
export const getConvertedValueForField = (field, value) => {
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

/** @deprecated
 * @see src/plugins/data/public/es_query/filters/phrase_filter.ts
 * Code was already moved into src/plugins/data/public.
 * This method will be removed after moving 'es_query' into new platform
 * */
export const buildInlineScriptForPhraseFilter = (scriptedField) => {
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

/** @deprecated
 * @see src/plugins/data/public/es_query/filters/phrase_filter.ts
 * Code was already moved into src/plugins/data/public.
 * This method will be removed after moving 'es_query' into new platform
 * */
export function getPhraseScript(field, value) {
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
}

/** @deprecated
 * @see src/plugins/data/public/es_query/filters/range_filter.ts
 * Code was already moved into src/plugins/data/public.
 * This method will be removed after moving 'kuery' into new platform
 * */
export function getRangeScript(field, params) {
  const operators = {
    gt: '>',
    gte: '>=',
    lte: '<=',
    lt: '<',
  };
  const comparators = {
    gt: 'boolean gt(Supplier s, def v) {return s.get() > v}',
    gte: 'boolean gte(Supplier s, def v) {return s.get() >= v}',
    lte: 'boolean lte(Supplier s, def v) {return s.get() <= v}',
    lt: 'boolean lt(Supplier s, def v) {return s.get() < v}',
  };

  const dateComparators = {
    gt: 'boolean gt(Supplier s, def v) {return s.get().toInstant().isAfter(Instant.parse(v))}',
    gte: 'boolean gte(Supplier s, def v) {return !s.get().toInstant().isBefore(Instant.parse(v))}',
    lte: 'boolean lte(Supplier s, def v) {return !s.get().toInstant().isAfter(Instant.parse(v))}',
    lt: 'boolean lt(Supplier s, def v) {return s.get().toInstant().isBefore(Instant.parse(v))}',
  };

  const knownParams = pick(params, (val, key) => {
    return key in operators;
  });
  let script = map(knownParams, (val, key) => {
    return '(' + field.script + ')' + get(operators, key) + key;
  }).join(' && ');

  // We must wrap painless scripts in a lambda in case they're more than a simple expression
  if (field.lang === 'painless') {
    const comp = field.type === 'date' ? dateComparators : comparators;
    const currentComparators = reduce(
      knownParams,
      (acc, val, key) => acc.concat(get(comp, key)),
      []
    ).join(' ');

    const comparisons = map(knownParams, (val, key) => {
      return `${key}(() -> { ${field.script} }, params.${key})`;
    }).join(' && ');

    script = `${currentComparators}${comparisons}`;
  }

  return {
    script: {
      source: script,
      params: knownParams,
      lang: field.lang,
    },
  };
}
