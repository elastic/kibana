import { getTypes } from './get_types';

/**
 *  Get the singular root type in the EsMappingsDsl
 *  object. If there are no types, or there are more
 *  that one type, this function will throw an error.
 *
 *  @param  {EsMappingsDsl} mappings
 *  @return {string}
 */
export function getRootType(mappings) {
  const allTypes = getTypes(mappings);

  if (allTypes.length !== 1) {
    throw new TypeError(`Unable to get root type of mappings object with ${allTypes.length} root types.`);
  }

  return allTypes[0];
}
