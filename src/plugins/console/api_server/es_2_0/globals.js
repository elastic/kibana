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

  api.addGlobalAutocompleteRules('script', {
    __template: {
      inline: "SCRIPT"
    },
    inline: "SCRIPT",
    file: "FILE_SCRIPT_NAME",
    id: "SCRIPT_ID",
    lang: "",
    params: {}
  });
};
