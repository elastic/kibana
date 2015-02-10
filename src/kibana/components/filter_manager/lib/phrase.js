define(function (require) {
  var _ = require('lodash');
  return function buildPhraseFilter(field, value, indexPattern) {
    var filter = { meta: { index: indexPattern.id} };

    if (field.scripted) {
      filter.script = {
        script: '(' + field.script + ') == value',
        lang: field.lang,
        params: {
          value: value
        }
      };
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
});
