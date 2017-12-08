/**
 *  Get the names of the types defined in the EsMappingsDsl
 *
 *  @param  {EsMappingsDsl} mappings
 *  @return {Array<string>}
 */
export function getTypes(mappings) {
  return Object.keys(mappings).filter(type => type !== '_default_');
}
