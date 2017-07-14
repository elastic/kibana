
/**
 *  Convert a mappings object for the kibana index into
 *  an array of "type" objects, that have "name" and "mapping"
 *  properties
 *
 *  @param  {Object} mappings See src/ui/ui_mappings#getCombined()
 *  @return {Array<Object>}
 */
export function getTypesFromMappings(mappings) {
  return Object.keys(mappings.doc.properties)
    .reduce((acc, type) => [
      ...acc,
      {
        name: type,
        mapping: mappings.doc.properties[type]
      }
    ], []);
}
