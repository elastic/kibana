import _ from 'lodash';
export default function buildPhraseFilter(field, value, indexPattern) {
  let filter = { meta: { index: indexPattern.id} };

  if (field.scripted) {
    // painless expects params.value while groovy and expression languages expect value.
    const valueClause = field.lang === 'painless' ? 'params.value' : 'value';

    // See https://github.com/elastic/elasticsearch/issues/20941 and https://github.com/elastic/kibana/issues/8677
    // for the reason behind this change. ES doesn't handle boolean types very well, so they come
    // back as strings.
    let convertedValue = value;
    if (typeof value !== 'boolean' && field.type === 'boolean') {
      if (value !== 'true' && value !== 'false') {
        throw new Error('Boolean scripted fields must return true or false');
      }
      convertedValue = value === 'true' ? true : false;
    }

    _.set(filter, 'script.script', {
      inline: '(' + field.script + ') == ' + valueClause,
      lang: field.lang,
      params: {
        value: convertedValue
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
