import _ from 'lodash';
import { PhraseFilterManager } from './phrase_filter_manager';

const termsAgg = (field, size, direction) => {
  const terms = {
    'size': size,
    'order': {
      '_count': direction
    }
  };
  if (field.scripted) {
    terms.script = {
      inline: field.script,
      lang: field.lang
    };
    terms.valueType = field.type === 'number' ? 'float' : field.type;
  } else {
    terms.field = field.name;
  }
  return {
    'termsAgg': {
      'terms': terms
    }
  };
};

export async function initTermsControl(controlParams, indexPatterns, SearchSource, queryFilter, callback) {
  const indexPattern = await indexPatterns.get(controlParams.indexPattern);
  const searchSource = new SearchSource();
  searchSource.inherits(false); //Do not filter by time so can not inherit from rootSearchSource
  searchSource.size(0);
  searchSource.index(indexPattern);
  searchSource.aggs(termsAgg(indexPattern.fields.byName[controlParams.fieldName], 5, 'desc'));

  const defer = {};
  defer.promise = new Promise((resolve, reject) => {
    defer.resolve = resolve;
    defer.reject = reject;
  });
  defer.promise.then((resp) => {
    const terms = _.get(resp, 'aggregations.termsAgg.buckets', []).map((bucket) => {
      return { label: bucket.key, value: bucket.key };
    });
    const filterManager = new PhraseFilterManager(controlParams.fieldName, indexPattern, queryFilter);
    callback({
      value: filterManager.getValueFromFilterBar(),
      type: controlParams.type,
      indexPattern: indexPattern,
      field: indexPattern.fields.byName[controlParams.fieldName],
      label: controlParams.label ? controlParams.label : controlParams.fieldName,
      terms: terms,
      filterManager: filterManager
    });
  });
  return searchSource._createRequest(defer);
}
