import _ from 'lodash';
export default function buildPhraseFilter(field, value, indexPattern) {
  let filter = { meta: { index: indexPattern.id} };

  if (field.scripted) {
    _.set(filter, 'script.script', {
      inline: '(' + field.script + ') == value',
      lang: field.lang,
      params: {
        value: value
      }
    });
    filter.meta.field = field.name;
  } else {
    filter.query = { match: {} };
    filter.query.match[field.name] = {
      query: value,
      type: 'phrase'
    };
  }
  return filter;
};
