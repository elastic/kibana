export default function (api) {
  const aliasRules = {
    filter: {},
    routing: '1',
    search_routing: '1,2',
    index_routing: '1'
  };
  api.addGlobalAutocompleteRules('aliases', {
    '*': aliasRules
  });
}
