/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import type { IndicesGetMappingResponse } from '@elastic/elasticsearch/lib/api/types';
import { getAutocompleteInfo } from '../../services';
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

function expandAliases(indicesOrAliases: string | string[]) {
  // takes a list of indices or aliases or a string which may be either and returns a list of indices
  // returns a list for multiple values or a string for a single.
  const perAliasIndexes = getAutocompleteInfo().alias.perAliasIndexes;
  if (!indicesOrAliases) {
    return indicesOrAliases;
  }

  if (typeof indicesOrAliases === 'string') {
    indicesOrAliases = [indicesOrAliases];
  }

  indicesOrAliases = indicesOrAliases.flatMap((iOrA) => {
    if (perAliasIndexes[iOrA]) {
      return perAliasIndexes[iOrA];
    }
    return [iOrA];
  });

  let ret = ([] as string[]).concat.apply([], indicesOrAliases);
  ret.sort();
  ret = ret.reduce((result, value, index, array) => {
    const last = array[index - 1];
    if (last !== value) {
      result.push(value);
    }
    return result;
  }, [] as string[]);

  return ret.length > 1 ? ret : ret[0];
}

export function getTypes(indices: string | string[]) {
  let ret: string[] = [];
  const perIndexTypes = getAutocompleteInfo().mapping.perIndexTypes;
  indices = expandAliases(indices);
  if (typeof indices === 'string') {
    const typeDict = perIndexTypes[indices];
    if (!typeDict) {
      return [];
    }

    // filter what we need
    if (Array.isArray(typeDict)) {
      typeDict.forEach((type) => {
        ret.push(type);
      });
    } else if (typeof typeDict === 'object') {
      Object.keys(typeDict).forEach((type) => {
        ret.push(type);
      });
    }
  } else {
    // multi index mode.
    Object.keys(perIndexTypes).forEach((index) => {
      if (!indices || indices.includes(index)) {
        ret.push(getTypes(index) as unknown as string);
      }
    });
    ret = ([] as string[]).concat.apply([], ret);
  }

  return _.uniq(ret);
}

export class Mapping {
  constructor(public perIndexTypes: Record<string, object> = {}) {}

  get = (indices: string | string[], types?: string | string[]) => {
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
          ret.push(this.get(index, types) as unknown as Field);
        }
      });

      ret = ([] as Field[]).concat.apply([], ret);
    }

    return _.uniqBy(ret, function (f) {
      return f.name + ':' + f.type;
    });
  };

  load = (mappings: IndicesGetMappingResponse) => {
    const maxMappingSize = Object.keys(mappings).length > 10 * 1024 * 1024;
    let mappingsResponse;
    if (maxMappingSize) {
      // eslint-disable-next-line no-console
      console.warn(
        `Mapping size is larger than 10MB (${
          Object.keys(mappings).length / 1024 / 1024
        } MB). Ignoring...`
      );
      mappingsResponse = {};
    } else {
      mappingsResponse = mappings;
    }

    this.perIndexTypes = {};

    Object.entries(mappingsResponse).forEach(([index, indexMapping]) => {
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

  clear = () => {
    this.perIndexTypes = {};
  };
}
