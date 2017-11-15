import { has, get } from 'lodash';
import { SavedObjectNotFound } from '../../errors';

export function FilterBarLibMapRangeProvider(Promise, courier) {
  return function (filter) {
    const isScriptedRangeFilter = isScriptedRange(filter);
    if (!filter.range && !isScriptedRangeFilter) {
      return Promise.reject(filter);
    }

    function getParams(indexPattern) {
      const type = 'range';
      const key = isScriptedRangeFilter ? filter.meta.field : Object.keys(filter.range)[0];
      const params = isScriptedRangeFilter ? filter.script.script.params : filter.range[key];

      let left = has(params, 'gte') ? params.gte : params.gt;
      if (left == null) left = -Infinity;

      let right = has(params, 'lte') ? params.lte : params.lt;
      if (right == null) right = Infinity;

      // Sometimes a filter will end up with an invalid index param. This could happen for a lot of reasons,
      // for example a user might manually edit the url or the index pattern's ID might change due to
      // external factors e.g. a reindex. We only need the index in order to grab the field formatter, so we fallback
      // on displaying the raw value if the index is invalid.
      let value = `${left} to ${right}`;
      if (indexPattern) {
        const convert = indexPattern.fields.byName[key].format.getConverterFor('text');
        value = `${convert(left)} to ${convert(right)}`;
      }

      return { type, key, value, params };
    }

    return courier
      .indexPatterns
      .get(filter.meta.index)
      .then(getParams)
      .catch((error) => {
        if (error instanceof SavedObjectNotFound) {
          return getParams();
        }
        throw error;
      });

  };
}

function isScriptedRange(filter) {
  const params = get(filter, ['script', 'script', 'params']);
  return params && Object.keys(params).find(key => ['gte', 'gt', 'lte', 'lt'].includes(key));
}
