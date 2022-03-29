/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsFieldMapping, IndexMapping, SavedObjectsMappingProperties } from '../types';
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
      // @ts-expect-error `properties` not defined on estypes.MappingMatchOnlyTextProperty
      ((value as SavedObjectsFieldMapping).properties || value.type === 'object')
    ) {
      acc[key] = value;
    }
    return acc;
  }, {} as SavedObjectsMappingProperties);
}
