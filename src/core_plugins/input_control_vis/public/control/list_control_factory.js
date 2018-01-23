import _ from 'lodash';
import {
  Control,
  noValuesDisableMsg
} from './control';
import { PhraseFilterManager } from './filter_manager/phrase_filter_manager';
import { createSearchSource } from './create_search_source';

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

export async function listControlFactory(controlParams, kbnApi, useTimeFilter) {
  const indexPattern = await kbnApi.indexPatterns.get(controlParams.indexPattern);

  const initialSearchSourceState = {
    timeout: '1s',
    terminate_after: 100000
  };
  const aggs = termsAgg(
    indexPattern.fields.byName[controlParams.fieldName],
    _.get(controlParams, 'options.size', 5),
    'desc');
  const searchSource = createSearchSource(kbnApi, initialSearchSourceState, indexPattern, aggs, useTimeFilter);

  const resp = await searchSource.fetch();
  const termsSelectOptions = _.get(resp, 'aggregations.termsAgg.buckets', []).map((bucket) => {
    return { label: bucket.key.toString(), value: bucket.key.toString() };
  }).sort((a, b) => {
    return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
  });

  const listControl = new ListControl(
    controlParams,
    new PhraseFilterManager(controlParams.id, controlParams.fieldName, indexPattern, kbnApi.queryFilter, listControlDelimiter),
    termsSelectOptions
  );
  if (termsSelectOptions.length === 0) {
    listControl.disable(noValuesDisableMsg(controlParams.fieldName, indexPattern.title));
  }
  return listControl;
}
