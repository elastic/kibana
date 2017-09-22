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
