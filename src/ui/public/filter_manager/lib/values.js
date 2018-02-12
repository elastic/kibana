// import { getPhraseScript } from './values';

export function buildValuesFilter(field, params, indexPattern) {
  const index = indexPattern.id;
  const type = 'values';
  const key = field.name;
  const values = params.values;

  const filter = {
    meta: { index, type, key, values, params }
  };

  // if (field.scripted) {
  //   should = params.map((value) => ({
  //     script: getPhraseScript(field, value)
  //   }));
  // } else {
  //   should = params.map((value) => ({
  //     match_phrase: {
  //       [field.name]: value
  //     }
  //   }));
  // }

  filter.query = {
    bool: {
      filter: {
        terms: {
          [field.name]: values
        }
      }
    }
  };

  return filter;
}
