import _ from 'lodash';
import { buildPhraseFilter } from 'ui/filter_manager/lib/phrase';

class TermsFilterManager {
  constructor(fieldName, indexPattern, queryFilter) {
    this.fieldName = fieldName;
    this.indexPattern = indexPattern;
    this.queryFilter = queryFilter;
  }

  createFilter(value) {
    return buildPhraseFilter(
      this.indexPattern.fields.byName[this.fieldName],
      value,
      this.indexPattern);
  }

  findFilters() {
    const kbnFilters = _.flatten([this.queryFilter.getAppFilters(), this.queryFilter.getGlobalFilters()]);
    return kbnFilters.filter((kbnFilter) => {
      if (_.has(kbnFilter, 'script')
        && _.get(kbnFilter, 'meta.index') === this.indexPattern.id
        && _.get(kbnFilter, 'meta.field') === this.fieldName) {
        //filter is a scripted filter for this index/field
        return true;
      } else if (_.has(kbnFilter, ['query', 'match', this.fieldName]) && _.get(kbnFilter, 'meta.index') === this.indexPattern.id) {
        //filter is a match filter for this index/field
        return true;
      }
      return false;
    });
  }

  getValueFromFilterBar() {
    const kbnFilters = this.findFilters();
    if (kbnFilters.length === 0) {
      return '';
    } else {
      if (_.has(kbnFilters[0], 'script')) {
        return _.get(kbnFilters[0], 'script.script.params.value');
      }
      return _.get(kbnFilters[0], ['query', 'match', this.fieldName, 'query']);
    }
  }
}

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
    const filterManager = new TermsFilterManager(controlParams.fieldName, indexPattern, queryFilter);
    callback({
      value: filterManager.getValueFromFilterBar(),
      indexPattern: indexPattern,
      field: indexPattern.fields.byName[controlParams.fieldName],
      label: controlParams.label ? controlParams.label : controlParams.fieldName,
      terms: terms,
      filterManager: filterManager
    });
  });
  return searchSource._createRequest(defer);
}
