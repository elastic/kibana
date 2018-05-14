import _ from 'lodash';
import {
  Control,
  noValuesDisableMsg,
  noIndexPatternMsg,
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

  getMultiSelectDelimiter() {
    return this.filterManager.delimiter;
  }

  async fetch() {
    const indexPattern = this.filterManager.getIndexPattern();
    if (!indexPattern) {
      this.disable(noIndexPatternMsg(this.controlParams.indexPattern));
      return;
    }

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

    const fieldName = this.filterManager.fieldName;
    const initialSearchSourceState = {
      timeout: '1s',
      terminate_after: 100000
    };
    const aggs = termsAgg(
      indexPattern.fields.byName[fieldName],
      _.get(this.options, 'size', 5),
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

    if(selectOptions.length === 0) {
      this.disable(noValuesDisableMsg(fieldName, indexPattern.title));
      return;
    }

    this.selectOptions = selectOptions;
    this.enable = true;
    this.disabledReason = '';
  }
}

export async function listControlFactory(controlParams, kbnApi, useTimeFilter) {
  let indexPattern;
  try {
    indexPattern = await kbnApi.indexPatterns.get(controlParams.indexPattern);
  } catch (err) {
    // ignore not found error and return control so it can be displayed in disabled state.
  }

  return new ListControl(
    controlParams,
    new PhraseFilterManager(controlParams.id, controlParams.fieldName, indexPattern, kbnApi.queryFilter, listControlDelimiter),
    kbnApi,
    useTimeFilter
  );
}
