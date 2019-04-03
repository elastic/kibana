export function getRoutes() {
  return {
    edit: '/management/kibana/index_patterns/{{id}}',
    addField: '/management/kibana/index_patterns/{{id}}/create-field',
    indexedFields: '/management/kibana/index_patterns/{{id}}?_a=(tab:indexedFields)',
    scriptedFields: '/management/kibana/index_patterns/{{id}}?_a=(tab:scriptedFields)',
    sourceFilters: '/management/kibana/index_patterns/{{id}}?_a=(tab:sourceFilters)'
  };
}
