import _ from 'lodash';
define(function (require) {
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
      filter.match = {
        [field.name]: {
          query: value,
          type: 'phrase'
        }
      };
    }
    return filter;
  };
});
