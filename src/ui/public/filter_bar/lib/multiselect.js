/**
 * Created by itzhak on 6/19/2017.
 */
import _ from 'lodash';

/**
 * Accept filter and seperate to field and value
 * @param filter
 * @returns {*}
 */
export function getFieldValueObject(filter) {
  if (filter.query) {
    const field = Object.keys(filter.query.match)[0];
    return { field: field, value: filter.query.match[field].query };
  }
  if (filter.range) {
    return { field: Object.keys(filter.range)[0], value: filter.range[Object.keys(filter.range)[0]] };

  }
}

/**
 * Take filters and create boolean filter request
 * @param filters
 * @returns {{query: {bool: {should: Array, must_not: Array}}, meta: {alias: string}}}
 */
export function makeFiltersBoolean(filters) {
  let shouldFilters = [];
  let mustNotFilters = [];
  let aliasFilterString = '';

  _.forEach(filters, function (filter) {
    const fieldValue = getFieldValueObject(filter);
    const value = fieldValue.value;

    if (filter.meta.negate) {
      mustNotFilters = mustNotFilters.concat(filter.query);
      aliasFilterString = aliasFilterString + '!' + value;
    }
    else {
      shouldFilters = filter.query ? shouldFilters.concat(filter.query) : shouldFilters.concat({ range: filter.range });
      if (filter.query) {
        aliasFilterString = aliasFilterString !== '' ? aliasFilterString + '||' + value : value;
      }
      if (filter.range) {
        const rangeValue = value.gte + ' to ' + value.lt;
        aliasFilterString = aliasFilterString !== '' ? aliasFilterString + '||' + rangeValue : rangeValue;
      }

    }
  });

  const boolQuery = {
    'query': {
      'bool': {
        'should': shouldFilters,
        'must_not': mustNotFilters
      }
    },
    'meta': {
      'alias': aliasFilterString
    }
  };
  return boolQuery;
}


/**
 * The function return true if the iSaveFilters contain the currentFilter
 * When its happened its mean the user click on slice that he already clicked, mean the user want to cancel
 * the previous click
 * @param iSaveFilters - all filters that added when CTRL pressed
 * @param currentFilter -
 * @returns {boolean}
 */
export function isRemoveFilter(iSaveFilters, currentFilter) {
  const removeFilters = _.remove(iSaveFilters, function (filter) {
    if (filter.query) {
      return _.isEqual(filter.query.match, currentFilter.query.match);
    }
    if (filter.range) {
      return _.isEqual(filter.range, currentFilter.range);
    }
  });
  return removeFilters.length === 0 ? false : true;
}

/**
 * return true if ctrl key pressed
 * @param event
 * @returns {boolean}
 */
export function isCtrlKeyPressed(event) {
  return event.ctrlKey || event.keyCode === 17 ? true : false;
}







