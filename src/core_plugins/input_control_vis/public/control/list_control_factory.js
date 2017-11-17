import _ from 'lodash';
import { Control } from './control';
import { PhraseFilterManager } from './filter_manager/phrase_filter_manager';

const termsAgg = (field, size, direction) => {
  if (size < 1) {
    size = 1;
  }
  const terms = {
    size: size,
    order: {
      _count: direction
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

const listControlDelimiter = '$$kbn_delimiter$$';

class ListControl extends Control {
  constructor(controlParams, filterManager, selectOptions) {
    super(controlParams, filterManager);

    this.selectOptions = selectOptions;
  }

  getMultiSelectDelimiter() {
    return this.filterManager.delimiter;
  }
}

export async function listControlFactory(controlParams, kbnApi) {
  const indexPattern = await kbnApi.indexPatterns.get(controlParams.indexPattern);
  // TODO replace SearchSource with call to suggestions API
  const searchSource = new kbnApi.SearchSource({
    timeout: '1s',
    terminate_after: 100000
  });
  searchSource.inherits(false); //Do not filter by time so can not inherit from rootSearchSource
  searchSource.size(0);
  searchSource.index(indexPattern);
  searchSource.aggs(termsAgg(
    indexPattern.fields.byName[controlParams.fieldName],
    _.get(controlParams, 'options.size', 5),
    'desc'));

  const resp = await searchSource.fetch();

  return new ListControl(
    controlParams,
    new PhraseFilterManager(controlParams.id, controlParams.fieldName, indexPattern, kbnApi.queryFilter, listControlDelimiter),
    _.get(resp, 'aggregations.termsAgg.buckets', []).map((bucket) => {
      return { label: bucket.key.toString(), value: bucket.key.toString() };
    })
  );
}
