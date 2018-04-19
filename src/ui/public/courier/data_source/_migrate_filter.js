import _ from 'lodash';
import { getConvertedValueForField } from '../../filter_manager/lib/phrase';

export function migrateFilter(filter, indexPattern) {
  if (filter.match) {
    const fieldName = Object.keys(filter.match)[0];


    if (isMatchPhraseFilter(filter, fieldName)) {
      const params = _.get(filter, ['match', fieldName]);
      if (indexPattern) {
        const field = indexPattern.fields.find(f => f.name === fieldName);
        if (field) {
          params.query = getConvertedValueForField(field, params.query);
        }
      }
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
