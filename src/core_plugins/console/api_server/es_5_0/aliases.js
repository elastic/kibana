export default function (api) {
  api.addEndpointDescription('_get_aliases', {
    methods: ['GET'],
    patterns: [
      "_aliases",
    ]
  });

  var aliasRules = {
    filter: {},
    routing: '1',
    search_routing: '1,2',
    index_routing: '1'
  };

  api.addEndpointDescription('_delete_alias', {
    methods: ["DELETE"],
    patterns: [
      "{indices}/_alias/{name}"
    ]
  });

  api.addGlobalAutocompleteRules('aliases', {
    '*': aliasRules
  });
}
