import _ from 'lodash';
import { SavedObjectNotFound } from '../../errors';

export function FilterBarLibMapPhraseProvider(Promise, courier) {
  return function (filter) {
    const isScriptedPhraseFilter = isScriptedPhrase(filter);
    if (!_.has(filter, ['query', 'match']) && !isScriptedPhraseFilter) {
      return Promise.reject(filter);
    }

    function getParams(indexPattern) {
      const type = 'phrase';
      const key = isScriptedPhraseFilter ? filter.meta.field : Object.keys(filter.query.match)[0];
      const params = isScriptedPhraseFilter ? filter.script.script.params : filter.query.match[key];
      const query = isScriptedPhraseFilter ? params.value : params.query;

      // Sometimes a filter will end up with an invalid index param. This could happen for a lot of reasons,
      // for example a user might manually edit the url or the index pattern's ID might change due to
      // external factors e.g. a reindex. We only need the index in order to grab the field formatter, so we fallback
      // on displaying the raw value if the index is invalid.
      const value = indexPattern ? indexPattern.fields.byName[key].format.convert(query) : query;
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

function isScriptedPhrase(filter) {
  const params = _.get(filter, ['script', 'script', 'params']);
  return params && params.value;
}
