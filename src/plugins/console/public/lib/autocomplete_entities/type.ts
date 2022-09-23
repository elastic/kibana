/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { getAutocompleteInfo } from '../../services';
import { expandAliases } from './expand_aliases';

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
