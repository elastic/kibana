import { has } from 'lodash';

export function FilterBarLibMapRangeProvider(Promise, courier) {
  return function (filter) {
    if (!filter.meta || filter.meta.type !== 'range') return Promise.reject(filter);

    return courier
    .indexPatterns
    .get(filter.meta.index)
    .then(function (indexPattern) {
      const key = filter.meta.field;
      const convert = indexPattern.fields.byName[key].format.getConverterFor('text');
      const range = filter.meta.params;

      let left = has(range, 'gte') ? range.gte : range.gt;
      if (left == null) left = -Infinity;

      let right = has(range, 'lte') ? range.lte : range.lt;
      if (right == null) right = Infinity;

      return {
        key: key,
        value: `${convert(left)} to ${convert(right)}`
      };
    });

  };
}
