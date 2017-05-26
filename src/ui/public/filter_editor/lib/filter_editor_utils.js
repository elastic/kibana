import _ from 'lodash';
import { FILTER_OPERATORS } from './filter_operators';
import {
  buildExistsFilter,
  buildPhraseFilter,
  buildRangeFilter,
  buildPhrasesFilter
} from '../../filter_manager/lib';

export function getQueryDslFromFilter(filter) {
  return _(filter)
    .omit(['meta', '$state'])
    .cloneDeep();
}

export function getFieldFromFilter(filter, indexPatterns) {
  const { index, key } = filter.meta;
  const indexPattern = indexPatterns && indexPatterns.find(({ id }) => id === index);
  return indexPattern && indexPattern.fields.byName[key];
}

export function getOperatorFromFilter(filter) {
  const { type, negate } = filter.meta;
  return FILTER_OPERATORS.find((operator) => {
    return operator.type === type && operator.negate === negate;
  });
}

export function getParamsFromFilter(filter) {
  const { type, key } = filter.meta;
  let params;
  if (type === 'phrase') {
    params = filter.query ? filter.query.match[key].query : filter.script.script.params.value;
  } else if (type === 'phrases') {
    params = filter.meta.params;
  } else if (type === 'range') {
    const range = filter.range ? filter.range[key] : filter.script.script.params;
    const from = _.has(range, 'gte') ? range.gte : range.gt;
    const to = _.has(range, 'lte') ? range.lte : range.lt;
    params = { from, to };
  }
  return {
    [type]: params
  };
}

export function getFieldOptions(indexPatterns) {
  return indexPatterns && indexPatterns.reduce((fields, indexPattern) => {
    const filterableFields = indexPattern.fields.filter(field => field.filterable);
    return [...fields, ...filterableFields];
  }, []);
}

export function getOperatorOptions(field) {
  const type = _.get(field, 'type');
  return FILTER_OPERATORS.filter((operator) => {
    return !operator.fieldTypes || operator.fieldTypes.includes(type);
  });
}

export function isFilterValid({ field, operator, params }) {
  if (!field || !operator) {
    return false;
  } else if (operator.type === 'phrase') {
    return _.has(params, 'phrase') && params.phrase !== '';
  } else if (operator.type === 'phrases') {
    return _.has(params, 'phrases') && params.phrases.length > 0;
  } else if (operator.type === 'range') {
    const hasFrom = _.has(params, ['range', 'from']) && params.range.from !== '';
    const hasTo = _.has(params, ['range', 'to']) && params.range.to !== '';
    return hasFrom || hasTo;
  }
  return true;
}

export function buildFilter({ field, operator, params }) {
  let filter;
  if (operator.type === 'phrase') {
    filter = buildPhraseFilter(field, params.phrase, field.indexPattern);
  } else if (operator.type === 'phrases') {
    filter = buildPhrasesFilter(field, params.phrases, field.indexPattern);
  } else if (operator.type === 'range') {
    filter = buildRangeFilter(field, { gte: params.range.from, lt: params.range.to }, field.indexPattern);
  } else if (operator.type === 'exists') {
    filter = buildExistsFilter(field, field.indexPattern);
  }
  filter.meta.negate = operator.negate;
  return filter;
}
