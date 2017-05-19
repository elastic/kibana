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
  const indexPattern = indexPatterns.find(({ id }) => id === index);
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
  if (type === 'phrase') {
    const value = filter.query ? filter.query.match[key].query : filter.script.script.params.value;
    return { value };
  } else if (type === 'phrases') {
    return { values: filter.meta.values };
  } else if (type === 'range') {
    const params = filter.range ? filter.range[key] : filter.script.script.params;
    const from = _.has(params, 'gte') ? params.gte : params.gt;
    const to = _.has(params, 'lte') ? params.lte : params.lt;
    return { from, to };
  }
  return {};
}

export function getFieldOptions(indexPatterns) {
  return indexPatterns.reduce((fields, indexPattern) => {
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
    return _.has(params, 'value') && params.value !== '';
  } else if (operator.type === 'phrases') {
    return _.has(params, 'values') && params.values.length > 0;
  } else if (operator.type === 'range') {
    const hasFrom = _.has(params, 'from') && params.from !== '';
    const hasTo = _.has(params, 'to') && params.to !== '';
    return hasFrom || hasTo;
  }
  return true;
}

export function buildFilter({ field, operator, params }) {
  let filter;
  if (operator.type === 'phrase') {
    filter = buildPhraseFilter(field, params.value, field.indexPattern);
  } else if (operator.type === 'phrases') {
    filter = buildPhrasesFilter(field, params.values, field.indexPattern);
  } else if (operator.type === 'range') {
    filter = buildRangeFilter(field, { gte: params.from, lt: params.to }, field.indexPattern);
  } else if (operator.type === 'exists') {
    filter = buildExistsFilter(field, field.indexPattern);
  }
  filter.meta.negate = operator.negate;
  return filter;
}
