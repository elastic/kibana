import toPath from 'lodash/internal/toPath';

import { getRootType } from './get_root_type';

/**
 *  Get a property of a mapping of type:object
 *  @param  {EsObjectMapping} mapping
 *  @param  {Array<string>} path
 *  @return {Objects|undefined}
 */
function getPropertyMappingFromObjectMapping(mapping, path) {
  if (!mapping || !mapping.properties) {
    return undefined;
  }

  if (path.length > 1) {
    return getPropertyMappingFromObjectMapping(
      mapping.properties[path[0]],
      path.slice(1)
    );
  } else {
    return mapping.properties[path[0]];
  }
}

/**
 *  Get the mapping for a specific property within the root type in the mapping.
 *  @param  {Object} mappings
 *  @param  {string|Array<string>} path
 *  @return {Object|undefined}
 */
export function getProperty(mappings, path) {
  return getPropertyMappingFromObjectMapping(
    mappings[getRootType(mappings)],
    toPath(path)
  );
}
