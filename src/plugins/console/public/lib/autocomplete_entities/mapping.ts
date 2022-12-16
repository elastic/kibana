/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import type { IndicesGetMappingResponse } from '@elastic/elasticsearch/lib/api/types';
import { expandAliases } from './expand_aliases';
import type { Field, FieldMapping } from './types';

function getFieldNamesFromProperties(properties: Record<string, FieldMapping> = {}) {
  const fieldList = Object.entries(properties).flatMap(([fieldName, fieldMapping]) => {
    return getFieldNamesFromFieldMapping(fieldName, fieldMapping);
  });

  // deduping
  return _.uniqBy(fieldList, function (f) {
    return f.name + ':' + f.type;
  });
}

function getFieldNamesFromFieldMapping(
  fieldName: string,
  fieldMapping: FieldMapping
): Array<{ name: string; type: string | undefined }> {
  if (fieldMapping.enabled === false) {
    return [];
  }
  let nestedFields;

  function applyPathSettings(nestedFieldNames: Array<{ name: string; type: string | undefined }>) {
    const pathType = fieldMapping.path || 'full';
    if (pathType === 'full') {
      return nestedFieldNames.map((f) => {
        f.name = fieldName + '.' + f.name;
        return f;
      });
    }
    return nestedFieldNames;
  }

  if (fieldMapping.properties) {
    // derived object type
    nestedFields = getFieldNamesFromProperties(fieldMapping.properties);
    return applyPathSettings(nestedFields);
  }

  const fieldType = fieldMapping.type;

  const ret = { name: fieldName, type: fieldType };

  if (fieldMapping.index_name) {
    ret.name = fieldMapping.index_name;
  }

  if (fieldMapping.fields) {
    nestedFields = Object.entries(fieldMapping.fields).flatMap(([name, mapping]) => {
      return getFieldNamesFromFieldMapping(name, mapping);
    });
    nestedFields = applyPathSettings(nestedFields);
    nestedFields.unshift(ret);
    return nestedFields;
  }

  return [ret];
}

export interface BaseMapping {
  perIndexTypes: Record<string, object>;
  getMappings(indices: string | string[], types?: string | string[]): Field[];
  loadMappings(mappings: IndicesGetMappingResponse): void;
  clearMappings(): void;
}

export class Mapping implements BaseMapping {
  public perIndexTypes: Record<string, object> = {};

  getMappings = (indices: string | string[], types?: string | string[]) => {
    // get fields for indices and types. Both can be a list, a string or null (meaning all).
    let ret: Field[] = [];
    indices = expandAliases(indices);

    if (typeof indices === 'string') {
      const typeDict = this.perIndexTypes[indices] as Record<string, unknown>;
      if (!typeDict) {
        return [];
      }

      if (typeof types === 'string') {
        const f = typeDict[types];
        if (Array.isArray(f)) {
          ret = f;
        }
      } else {
        // filter what we need
        Object.entries(typeDict).forEach(([type, fields]) => {
          if (!types || types.length === 0 || types.includes(type)) {
            ret.push(fields as Field);
          }
        });

        ret = ([] as Field[]).concat.apply([], ret);
      }
    } else {
      // multi index mode.
      Object.keys(this.perIndexTypes).forEach((index) => {
        if (!indices || indices.length === 0 || indices.includes(index)) {
          ret.push(this.getMappings(index, types) as unknown as Field);
        }
      });

      ret = ([] as Field[]).concat.apply([], ret);
    }

    return _.uniqBy(ret, function (f) {
      return f.name + ':' + f.type;
    });
  };

  loadMappings = (mappings: IndicesGetMappingResponse) => {
    this.perIndexTypes = {};

    Object.entries(mappings).forEach(([index, indexMapping]) => {
      const normalizedIndexMappings: Record<string, object[]> = {};
      let transformedMapping: Record<string, any> = indexMapping;

      // Migrate 1.0.0 mappings. This format has changed, so we need to extract the underlying mapping.
      if (indexMapping.mappings && Object.keys(indexMapping).length === 1) {
        transformedMapping = indexMapping.mappings;
      }

      Object.entries(transformedMapping).forEach(([typeName, typeMapping]) => {
        if (typeName === 'properties') {
          const fieldList = getFieldNamesFromProperties(typeMapping);
          normalizedIndexMappings[typeName] = fieldList;
        } else {
          normalizedIndexMappings[typeName] = [];
        }
      });
      this.perIndexTypes[index] = normalizedIndexMappings;
    });
  };

  clearMappings = () => {
    this.perIndexTypes = {};
  };
}
