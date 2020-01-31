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

import _ from 'lodash';
const OPERANDS_IN_RANGE = 2;
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

function formatValue(field, params) {
  return _.map(params, (val, key) => operators[key] + format(field, val)).join(' ');
}

// Creates a filter where the value for the given field is in the given range
// params should be an object containing `lt`, `lte`, `gt`, and/or `gte`
export function buildRangeFilter(field, params, indexPattern, formattedValue) {
  const filter = { meta: { index: indexPattern.id } };
  if (formattedValue) filter.meta.formattedValue = formattedValue;

  params = _.mapValues(params, value => {
    return field.type === 'number' ? parseFloat(value) : value;
  });

  if ('gte' in params && 'gt' in params) throw new Error('gte and gt are mutually exclusive');
  if ('lte' in params && 'lt' in params) throw new Error('lte and lt are mutually exclusive');

  const totalInfinite = ['gt', 'lt'].reduce((totalInfinite, op) => {
    const key = op in params ? op : `${op}e`;
    const isInfinite = Math.abs(params[key]) === Infinity;

    if (isInfinite) {
      totalInfinite++;
      delete params[key];
    }

    return totalInfinite;
  }, 0);

  if (totalInfinite === OPERANDS_IN_RANGE) {
    filter.match_all = {};
    filter.meta.field = field.name;
  } else if (field.scripted) {
    filter.script = getRangeScript(field, params);
    filter.script.script.params.value = formatValue(field, filter.script.script.params);

    filter.meta.field = field.name;
  } else {
    filter.range = {};
    filter.range[field.name] = params;
  }

  return filter;
}

export function getRangeScript(field, params) {
  const knownParams = _.pick(params, (val, key) => {
    return key in operators;
  });
  let script = _.map(knownParams, function(val, key) {
    return '(' + field.script + ')' + operators[key] + key;
  }).join(' && ');

  // We must wrap painless scripts in a lambda in case they're more than a simple expression
  if (field.lang === 'painless') {
    const comp = field.type === 'date' ? dateComparators : comparators;
    const currentComparators = _.reduce(
      knownParams,
      (acc, val, key) => acc.concat(comp[key]),
      []
    ).join(' ');

    const comparisons = _.map(knownParams, function(val, key) {
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

function format(field, value) {
  return field && field.format && field.format.convert ? field.format.convert(value) : value;
}
