import { PhraseFilterManager } from './phrase_filter_manager';

async function getSuggestions(indexPatterns, fieldName, SearchSource, value) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([value, 'one', 'two', 'three']);
    }, 0);
  });
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
    getSuggestions: getSuggestions.bind(null, indexPatterns, controlParams.fieldName, SearchSource)
  });

  // No search request needed to init control
  return null;
}
