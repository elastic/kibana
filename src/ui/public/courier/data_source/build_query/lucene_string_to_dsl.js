import _ from 'lodash';

export function luceneStringToDsl(query) {
  if (!_.isString(query)) {
    return query;
  }

  if (query.trim() === '') {
    return { match_all: {} };
  }

  return { query_string: { query } };
}
