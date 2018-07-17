/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// @ts-ignore internal modules are not typed
import toPath from 'lodash/internal/toPath';

import { getRootType } from './get_root_type';
import { EsMapping, EsMappings } from './types';

/**
 *  Recursively read properties from the mapping object of type "object"
 *  until the `path` is resolved.
 */
function getPropertyMappingFromObjectMapping(
  mapping: EsMapping,
  path: string[]
): EsMapping | undefined {
  const props = mapping && (mapping.properties || mapping.fields);

  if (!props) {
    return;
  }

  if (path.length > 1) {
    return getPropertyMappingFromObjectMapping(props[path[0]], path.slice(1));
  } else {
    return props[path[0]];
  }
}

/**
 *  Get the mapping for a specific property within the root type of the EsMappingsDsl.
 *  @param  {EsMappingsDsl} mappings
 *  @param  {string|Array<string>} path
 *  @return {Object|undefined}
 */
export function getProperty(mappings: EsMappings, path: string[] | string) {
  return getPropertyMappingFromObjectMapping(mappings[getRootType(mappings)], toPath(path));
}
