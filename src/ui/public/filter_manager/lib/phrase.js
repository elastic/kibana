import _ from 'lodash';
export default function buildPhraseFilter(field, value, indexPattern) {
  let filter = { meta: { index: indexPattern.id} };

  if (field.scripted) {
    // painless expects params.value while groovy and expression languages expect value.
    const valueClause = field.lang === 'painless' ? 'params.value' : 'value';
    _.set(filter, 'script.script', {
      inline: '(' + field.script + ') == ' + valueClause,
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
