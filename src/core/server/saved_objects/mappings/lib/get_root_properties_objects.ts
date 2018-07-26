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

import { getRootProperties } from './get_root_properties';
import { EsMappings } from './types';

/**
 *  Get the property mappings for the root type in the EsMappings
 *  where the properties are objects
 *
 *  If the mappings don't have a root type, or the root type is not
 *  an object type (it's a keyword or something) this function will
 *  throw an error.
 *
 *  This data can be found at `{indexName}.mappings.{typeName}.properties`
 *  in the es indices.get() response where the properties are objects.
 *
 *  @param  {EsMappings} mappings
 *  @return {EsMappings}
 */
export function getRootPropertiesObjects(mappings: EsMappings): EsMappings {
  const rootProperties = getRootProperties(mappings);
  return Object.entries(rootProperties).reduce(
    (acc: EsMappings, [key, value]) => {
      // if value has properties or a type of object, we assume it is an object datatype
      if (value.properties || value.type === 'object') {
        acc[key] = value;
      }

      return acc;
    },
    {} as any
  ) as EsMappings;
}
