import { has } from 'lodash';
export default function mapRangeProvider(Promise, courier) {
  return function (filter) {
    if (!filter.range) return Promise.reject(filter);

    return courier
    .indexPatterns
    .get(filter.meta.index)
    .then(function (indexPattern) {
      const key = Object.keys(filter.range)[0];
      const convert = indexPattern.fields.byName[key].format.getConverterFor('text');
      const range = filter.range[key];

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
