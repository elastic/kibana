import _ from 'lodash';

export function migrateFilter(filter) {
  if (filter.match) {
    const fieldName = Object.keys(filter.match)[0];

    if (isMatchPhraseFilter(filter, fieldName)) {
      const newFilter = {
        match_phrase: _.clone(filter.match, true)
      };
      delete newFilter.match_phrase[fieldName].type;
      return newFilter;
    }
  }

  return filter;
}

function isMatchPhraseFilter(filter, fieldName) {
  return _.get(filter, ['match', fieldName, 'type']) === 'phrase';
}
