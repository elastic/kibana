define(function () {
  'use strict';

  return function init(kb) {
    kb.addGlobalAutocompleteRules('highlight', {
      pre_tags: {},
      post_tags: {},
      tags_schema: {},
      fields: {
        '$FIELD$': {
          fragment_size: 20,
          number_of_fragments: 3
        }
      }
    });

    // only used with scope links as there is no common name for scripts
    kb.addGlobalAutocompleteRules('SCRIPT_ENV', {
      __template: { 'script': ''},
      script: '',
      lang: '',
      params: {}
    });
  };

});
