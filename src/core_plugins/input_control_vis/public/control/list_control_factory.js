import _ from 'lodash';
import {
  Control,
  noValuesDisableMsg
} from './control';
import { PhraseFilterManager } from './filter_manager/phrase_filter_manager';
import { createSearchSource } from './create_search_source';
import {
  DEFAULT_LIST_SIZE,
  DEFAULT_TIMEOUT,
  DEFAULT_TERMINATE_AFTER,
} from '../editor_utils';

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

  getMultiSelectDelimiter() {
    return this.filterManager.delimiter;
  }

  async fetch() {
    this.warning = null;

    let ancestorFilters;
    if (this.hasAncestors()) {
      if (this.hasUnsetAncestor()) {
        this.disable(`Disabled until '${this.ancestors[0].label}' is set.`);
        return;
      }

      const ancestorValues = this.getAncestorValues();
      if (_.isEqual(ancestorValues, this.lastAncestorValues)) {
        // short circuit to avoid fetching options list for same ancestor values
        return;
      }
      this.lastAncestorValues = ancestorValues;

      ancestorFilters = this.getAncestorFilters();
    }

    const indexPattern = this.filterManager.getIndexPattern();
    const fieldName = this.filterManager.fieldName;
    const initialSearchSourceState = {
      timeout: `${_.get(this.options, 'timeout', DEFAULT_TIMEOUT)}s`,
      terminate_after: _.get(this.options, 'terminateAfter', DEFAULT_TERMINATE_AFTER)
    };
    const aggs = termsAgg(
      indexPattern.fields.byName[fieldName],
      _.get(this.options, 'size', DEFAULT_LIST_SIZE),
      'desc');
    const searchSource = createSearchSource(
      this.kbnApi,
      initialSearchSourceState,
      indexPattern,
      aggs,
      this.useTimeFilter,
      ancestorFilters);

    const resp = await searchSource.fetch();
    const selectOptions = _.get(resp, 'aggregations.termsAgg.buckets', []).map((bucket) => {
      return { label: this.format(bucket.key), value: bucket.key.toString() };
    }).sort((a, b) => {
      return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
    });

    if (selectOptions.length === 0) {
      this.disable(noValuesDisableMsg(fieldName, indexPattern.title));
      return;
    }

    if (resp.terminated_early || resp.timed_out) {
      this.warning = 'Incomplete terms list. Adjust "timeout" and "terminateAfter" options to allow more resource intensive searches.';
    }

    this.selectOptions = selectOptions;
    this.enable = true;
    this.disabledReason = '';
  }
}

export async function listControlFactory(controlParams, kbnApi, useTimeFilter) {
  const indexPattern = await kbnApi.indexPatterns.get(controlParams.indexPattern);

  return new ListControl(
    controlParams,
    new PhraseFilterManager(controlParams.id, controlParams.fieldName, indexPattern, kbnApi.queryFilter, listControlDelimiter),
    kbnApi,
    useTimeFilter
  );
}
