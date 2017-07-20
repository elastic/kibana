import { has, get } from 'lodash';

export function FilterBarLibMapRangeProvider(Promise, courier) {
  return function (filter) {
    const isScriptedRangeFilter = isScriptedRange(filter);
    if (!filter.range && !isScriptedRangeFilter) {
      return Promise.reject(filter);
    }

    return courier
    .indexPatterns
    .get(filter.meta.index)
    .then(function (indexPattern) {
      const type = 'range';
      const key = isScriptedRangeFilter ? filter.meta.field : Object.keys(filter.range)[0];
      const convert = indexPattern.fields.byName[key].format.getConverterFor('text');
      const range = isScriptedRangeFilter ? filter.script.script.params : filter.range[key];

      let left = has(range, 'gte') ? range.gte : range.gt;
      if (left == null) left = -Infinity;

      let right = has(range, 'lte') ? range.lte : range.lt;
      if (right == null) right = Infinity;

      const value = `${convert(left)} to ${convert(right)}`;

      return { type, key, value };
    });

  };
}

function isScriptedRange(filter) {
  const params = get(filter, ['script', 'script', 'params']);
  return params && Object.keys(params).find(key => ['gte', 'gt', 'lte', 'lt'].includes(key));
}
