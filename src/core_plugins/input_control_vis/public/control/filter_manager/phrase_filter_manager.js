import _ from 'lodash';
import { FilterManager } from './filter_manager.js';
import { buildPhraseFilter } from 'ui/filter_manager/lib/phrase';
import { buildPhrasesFilter } from 'ui/filter_manager/lib/phrases';

const EMPTY_VALUE = '';

export class PhraseFilterManager extends FilterManager {
  constructor(fieldName, indexPattern, queryFilter) {
    super(fieldName, indexPattern, queryFilter, EMPTY_VALUE);
  }

  /**
   * Convert phrases into filter
   *
   * @param {string} react-select value (comma-separated string of values)
   * @return {object} query filter
   *   single phrase: match query
   *   multiple phrases: bool query with should containing list of match_phrase queries
   */
  createFilter(value) {
    const phrases = value.split(',');
    if (phrases.length === 1) {
      return buildPhraseFilter(
        this.indexPattern.fields.byName[this.fieldName],
        phrases[0],
        this.indexPattern);
    } else {
      return buildPhrasesFilter(
        this.indexPattern.fields.byName[this.fieldName],
        phrases,
        this.indexPattern);
    }
  }

  findFilters() {
    const kbnFilters = _.flatten([this.queryFilter.getAppFilters(), this.queryFilter.getGlobalFilters()]);
    return kbnFilters.filter((kbnFilter) => {
      return this._findFilter(kbnFilter);
    });
  }

  _findFilter(kbnFilter) {
    // bool filter - multiple phrase filters
    if (_.has(kbnFilter, 'query.bool.should')) {
      const subFilters = _.get(kbnFilter, 'query.bool.should')
      .map((kbnFilter) => {
        return this._findFilter(kbnFilter);
      });
      return subFilters.reduce((a, b) => {
        return a || b;
      });
    }

    // scripted field filter
    if (_.has(kbnFilter, 'script')
      && _.get(kbnFilter, 'meta.index') === this.indexPattern.id
      && _.get(kbnFilter, 'meta.field') === this.fieldName) {
      return true;
    }

    // single phrase filter
    if (_.has(kbnFilter, ['query', 'match', this.fieldName])) {
      return true;
    }

    // single phrase filter from bool filter
    if (_.has(kbnFilter, ['match_phrase', this.fieldName])) {
      return true;
    }

    return false;
  }

  getValueFromFilterBar() {
    const kbnFilters = this.findFilters();
    if (kbnFilters.length === 0) {
      return this.getUnsetValue();
    } else {
      const values = kbnFilters
        .map((kbnFilter) => {
          return this._getValueFromFilter(kbnFilter);
        });
      return values.join();
    }
  }

  _getValueFromFilter(kbnFilter) {
    // bool filter - multiple phrase filters
    if (_.has(kbnFilter, 'query.bool.should')) {
      return _.get(kbnFilter, 'query.bool.should')
      .map((kbnFilter) => {
        return this._getValueFromFilter(kbnFilter);
      })
      .filter((value) => {
        if (value) {
          return true;
        }
        return false;
      })
      .join();
    }

    // scripted field filter
    if (_.has(kbnFilter, 'script')) {
      return _.get(kbnFilter, 'script.script.params.value', this.getUnsetValue());
    }

    // single phrase filter
    if (_.has(kbnFilter, ['query', 'match', this.fieldName])) {
      return _.get(kbnFilter, ['query', 'match', this.fieldName, 'query'], this.getUnsetValue());
    }

    // single phrase filter from bool filter
    if (_.has(kbnFilter, ['match_phrase', this.fieldName])) {
      return _.get(kbnFilter, ['match_phrase', this.fieldName], this.getUnsetValue());
    }

    return this.getUnsetValue();
  }
}
