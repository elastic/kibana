define(function (require) {
  var _ = require('lodash');
  return function buildPhraseFilter(field, value) {
    var filter = { meta: { index: field.indexPattern.id} };

    if (field.scripted) {
      filter.script = {
        script: '(' + field.script + ') == value',
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