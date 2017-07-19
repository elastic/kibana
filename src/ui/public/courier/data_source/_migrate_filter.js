import _ from 'lodash';

export function migrateFilter(filter) {
  if (filter.match) {
    const fieldName = Object.keys(filter.match)[0];

    if (isMatchPhraseFilter(filter, fieldName)) {
      const params = _.get(filter, ['match', fieldName]);
      return {
        match_phrase: {
          [fieldName]: _.omit(params, 'type'),
        },
      };
    }
  }

  return filter;
}

function isMatchPhraseFilter(filter, fieldName) {
  return _.get(filter, ['match', fieldName, 'type']) === 'phrase';
}
