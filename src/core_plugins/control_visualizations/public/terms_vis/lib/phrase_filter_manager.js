import _ from 'lodash';
import { buildPhraseFilter } from 'ui/filter_manager/lib/phrase';

export class PhraseFilterManager {
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
