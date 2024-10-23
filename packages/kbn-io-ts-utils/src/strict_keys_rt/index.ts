/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { either, isRight } from 'fp-ts/lib/Either';
import { difference, isPlainObject, forEach, isArray, castArray } from 'lodash';
import { MergeType } from '../merge_rt';

/*
  Type that tracks validated keys, and fails when the input value
  has keys that have not been validated.
*/

type ParsableType =
  | t.IntersectionType<ParsableType[]>
  | t.UnionType<ParsableType[]>
  | t.PartialType<any>
  | t.ExactType<ParsableType>
  | t.InterfaceType<any>
  | MergeType<any, any>
  | t.DictionaryType<any, any>
  | t.ArrayType<any, any>
  | t.AnyType;

const tags = [
  'DictionaryType',
  'IntersectionType',
  'MergeType',
  'InterfaceType',
  'PartialType',
  'ExactType',
  'UnionType',
  'ArrayType',
  'AnyType',
];

function isParsableType(type: t.Mixed): type is ParsableType {
  return tags.includes((type as any)._tag);
}

function getHandlingTypes(type: t.Mixed, key: string, value: object): t.Mixed[] {
  if (!isParsableType(type)) {
    return [];
  }

  switch (type._tag) {
    case 'AnyType':
      return [type];

    case 'ArrayType':
      return [type.type];

    case 'DictionaryType':
      return [type.codomain];

    case 'IntersectionType':
      return type.types.map((i) => getHandlingTypes(i, key, value)).flat();

    case 'MergeType':
      return type.types.map((i) => getHandlingTypes(i, key, value)).flat();

    case 'InterfaceType':
    case 'PartialType':
      return [type.props[key]];

    case 'ExactType':
      return getHandlingTypes(type.type, key, value);

    case 'UnionType':
      const matched = type.types.find((m) => isRight(m.decode(value)));
      return matched ? getHandlingTypes(matched, key, value) : [];
  }
}

function getHandledKeys<T extends Record<string, unknown>>(
  type: t.Mixed,
  object: T,
  prefix: string = ''
): { handled: Set<string>; all: Set<string> } {
  const keys: {
    handled: Set<string>;
    all: Set<string>;
  } = {
    handled: new Set(),
    all: new Set(),
  };

  forEach(object, (value, key) => {
    const ownPrefix = prefix ? `${prefix}.${key}` : key;
    keys.all.add(ownPrefix);

    const handlingTypes = getHandlingTypes(type, key, object).filter(Boolean);

    if (handlingTypes.length) {
      keys.handled.add(ownPrefix);
    }

    const processObject = (typeForObject: t.Mixed, objectToProcess: Record<string, unknown>) => {
      const nextKeys = getHandledKeys(typeForObject, objectToProcess, ownPrefix);
      nextKeys.all.forEach((k) => keys.all.add(k));
      nextKeys.handled.forEach((k) => keys.handled.add(k));
    };

    if (isPlainObject(value)) {
      handlingTypes.forEach((typeAtIndex) => {
        processObject(typeAtIndex, value as Record<string, unknown>);
      });
    }

    if (isArray(value)) {
      handlingTypes.forEach((typeAtIndex) => {
        if (!isParsableType(typeAtIndex) || typeAtIndex._tag !== 'ArrayType') {
          return;
        }

        const innerType = typeAtIndex.type;

        castArray(value).forEach((valueAtIndex) => {
          if (isPlainObject(valueAtIndex)) {
            processObject(innerType, valueAtIndex as Record<string, unknown>);
          }
        });
      });
    }
  });

  return keys;
}

export function strictKeysRt<T extends t.Any>(type: T) {
  return new t.Type(
    type.name,
    type.is,
    (input, context) => {
      return either.chain(type.validate(input, context), (i) => {
        const keys = getHandledKeys(type, input as Record<string, unknown>);

        const excessKeys = difference([...keys.all], [...keys.handled]);

        if (excessKeys.length) {
          return t.failure(i, context, `Excess keys are not allowed:\n${excessKeys.join('\n')}`);
        }

        return t.success(i);
      });
    },
    type.encode
  );
}
