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

import {
  SavedObjectsComplexFieldMapping,
  IndexMapping,
  SavedObjectsMappingProperties,
} from '../types';
import { getRootProperties } from './get_root_properties';

/**
 *  Get the property mappings for the root type in the EsMappingsDsl
 *  where the properties are objects
 *
 *  If the mappings don't have a root type, or the root type is not
 *  an object type (it's a keyword or something) this function will
 *  throw an error.
 *
 *  This data can be found at `{indexName}.mappings.{typeName}.properties`
 *  in the es indices.get() response where the properties are objects.
 *
 *  @param  {EsMappingsDsl} mappings
 *  @return {EsPropertyMappings}
 */

const omittedRootProps = ['migrationVersion', 'references'];

export function getRootPropertiesObjects(mappings: IndexMapping) {
  const rootProperties = getRootProperties(mappings);
  return Object.entries(rootProperties).reduce((acc, [key, value]) => {
    // we consider the existence of the properties or type of object to designate that this is an object datatype
    if (
      !omittedRootProps.includes(key) &&
      ((value as SavedObjectsComplexFieldMapping).properties || value.type === 'object')
    ) {
      acc[key] = value;
    }
    return acc;
  }, {} as SavedObjectsMappingProperties);
}
