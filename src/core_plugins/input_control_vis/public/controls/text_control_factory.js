import { PhraseFilterManager } from '../lib/phrase_filter_manager';

async function getSuggestions(indexPattern, fieldName, SearchSource, value) {
  const query = { match_phrase_prefix: {} };
  query.match_phrase_prefix[fieldName] = {
    query: value
  };
  const searchSource = new SearchSource();
  searchSource.inherits(false); //Do not filter by time so can not inherit from rootSearchSource
  searchSource.size(10);
  searchSource.index(indexPattern);
  searchSource.source({
    includes: [fieldName],
    excludes: []
  });
  searchSource.query(query);
  return searchSource.fetch();
}

export async function textControlFactory(controlParams, kbnApi, callback) {
  const indexPattern = await kbnApi.indexPatterns.get(controlParams.indexPattern);
  const filterManager = new PhraseFilterManager(controlParams.fieldName, indexPattern, kbnApi.queryFilter);
  callback({
    value: filterManager.getValueFromFilterBar(),
    type: controlParams.type,
    indexPattern: indexPattern,
    field: indexPattern.fields.byName[controlParams.fieldName],
    label: controlParams.label ? controlParams.label : controlParams.fieldName,
    filterManager: filterManager,
    getSuggestions: getSuggestions.bind(null, indexPattern, controlParams.fieldName, kbnApi.SearchSource)
  });

  // No search request needed to init control
  return null;
}
