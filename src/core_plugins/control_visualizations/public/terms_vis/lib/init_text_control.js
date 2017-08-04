import { PhraseFilterManager } from './phrase_filter_manager';

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

export async function initTextControl(controlParams, indexPatterns, SearchSource, queryFilter, callback) {
  const indexPattern = await indexPatterns.get(controlParams.indexPattern);
  const filterManager = new PhraseFilterManager(controlParams.fieldName, indexPattern, queryFilter);
  callback({
    value: filterManager.getValueFromFilterBar(),
    type: controlParams.type,
    indexPattern: indexPattern,
    field: indexPattern.fields.byName[controlParams.fieldName],
    label: controlParams.label ? controlParams.label : controlParams.fieldName,
    filterManager: filterManager,
    getSuggestions: getSuggestions.bind(null, indexPattern, controlParams.fieldName, SearchSource)
  });

  // No search request needed to init control
  return null;
}
