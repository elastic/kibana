import { getPhraseScript } from './phrase';

export function buildPhrasesFilter(field, values, indexPattern) {
  const index = indexPattern.id;
  const type = 'phrases';
  const key = field.name;
  const value = values
    .map(value => field.format.convert(value))
    .join(', ');

  const filter = {
    meta: { index, type, key, value, values }
  };

  let should;
  if (field.scripted) {
    should = values.map((value) => ({
      script: getPhraseScript(field, value)
    }));
  } else {
    should = values.map((value) => ({
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
