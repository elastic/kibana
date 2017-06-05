import { getPhraseScript } from './phrase';

export function buildPhrasesFilter(field, params, indexPattern) {
  const index = indexPattern.id;
  const type = 'phrases';
  const key = field.name;
  const value = params
    .map(value => field.format.convert(value))
    .join(', ');

  const filter = {
    meta: { index, type, key, value, params }
  };

  let should;
  if (field.scripted) {
    should = params.map((value) => ({
      script: getPhraseScript(field, value)
    }));
  } else {
    should = params.map((value) => ({
      match_phrase: {
        [field.name]: value
      }
    }));
  }

  filter.query = {
    bool: {
      should,
      minimum_should_match: 1
    }
  };

  return filter;
}
