/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { mapValues } from 'lodash';
import { mergeRt } from '../merge_rt';
import { isParsableType, ParseableType } from '../parseable_types';

export function deepExactRt<T extends t.Type<any> | ParseableType>(type: T): T;

export function deepExactRt(type: t.Type<any> | ParseableType) {
  if (!isParsableType(type)) {
    return type;
  }

  switch (type._tag) {
    case 'ArrayType':
      return t.array(deepExactRt(type.type));

    case 'DictionaryType':
      return t.dictionary(type.domain, deepExactRt(type.codomain));

    case 'InterfaceType':
      return t.exact(t.interface(mapValues(type.props, deepExactRt)));

    case 'PartialType':
      return t.exact(t.partial(mapValues(type.props, deepExactRt)));

    case 'IntersectionType':
      return t.intersection(type.types.map(deepExactRt) as any);

    case 'UnionType':
      return t.union(type.types.map(deepExactRt) as any);

    case 'MergeType':
      return mergeRt(deepExactRt(type.types[0]), deepExactRt(type.types[1]));

    default:
      return type;
  }
}
