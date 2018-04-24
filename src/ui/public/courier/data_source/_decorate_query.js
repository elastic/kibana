import _ from 'lodash';
import chrome from '../../chrome';

const config = chrome.getUiSettingsClient();

/**
 * Decorate queries with default parameters
 * @param {query} query object
 * @returns {object}
 */
export function decorateQuery(query) {
  const queryOptions = config.get('query:queryString:options');

  if (_.has(query, 'query_string.query')) {
    _.extend(query.query_string, queryOptions);
  }

  return query;
}
