import _ from 'lodash';
import { Control } from './control';
import { PhraseFilterManager } from './filter_manager/phrase_filter_manager';

const termsAgg = (field, size, direction) => {
  if (size < 1) {
    size = 1;
  }
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

class ListControl extends Control {
  constructor(controlParams, field, filterManager, selectOptions) {
    super(controlParams, field, filterManager);

    this.selectOptions = selectOptions;
  }
}

export async function listControlFactory(controlParams, kbnApi, callback) {
  const indexPattern = await kbnApi.indexPatterns.get(controlParams.indexPattern);
  const searchSource = new kbnApi.SearchSource();
  searchSource.inherits(false); //Do not filter by time so can not inherit from rootSearchSource
  searchSource.size(0);
  searchSource.index(indexPattern);
  searchSource.aggs(termsAgg(
    indexPattern.fields.byName[controlParams.fieldName],
    _.get(controlParams, 'options.size', 5),
    'desc'));

  const defer = {};
  defer.promise = new Promise((resolve, reject) => {
    defer.resolve = resolve;
    defer.reject = reject;
  });
  defer.promise.then((resp) => {
    callback(new ListControl(
      controlParams,
      indexPattern.fields.byName[controlParams.fieldName],
      new PhraseFilterManager(controlParams.fieldName, indexPattern, kbnApi.queryFilter),
      _.get(resp, 'aggregations.termsAgg.buckets', []).map((bucket) => {
        return { label: bucket.key, value: bucket.key };
      })
    ));
  });
  return searchSource._createRequest(defer);
}
