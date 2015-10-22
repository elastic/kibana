module.exports = function (api) {
  api.addGlobalAutocompleteRules('highlight', {
    pre_tags: {},
    post_tags: {},
    tags_schema: {},
    fields: {
      '{field}': {
        fragment_size: 20,
        number_of_fragments: 3
      }
    }
  });

  // only used with scope links as there is no common name for scripts
  api.addGlobalAutocompleteRules('SCRIPT_ENV', {
    __template: {'script': ''},
    script: '',
    lang: '',
    params: {}
  });
};
