/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';
import { difference, isPlainObject, forEach } from 'lodash';
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
  | t.DictionaryType<any, any>;

const tags = [
  'DictionaryType',
  'IntersectionType',
  'MergeType',
  'InterfaceType',
  'PartialType',
  'ExactType',
  'UnionType',
];

function isParsableType(type: t.Mixed): type is ParsableType {
  return tags.includes((type as any)._tag);
}

function getHandlingTypes(type: t.Mixed, key: string, value: object): t.Mixed[] {
  if (!isParsableType(type)) {
    return [];
  }

  switch (type._tag) {
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
      const matched = type.types.find((m) => m.is(value));
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

    if (isPlainObject(value)) {
      handlingTypes.forEach((i) => {
        const nextKeys = getHandledKeys(i, value as Record<string, unknown>, ownPrefix);
        nextKeys.all.forEach((k) => keys.all.add(k));
        nextKeys.handled.forEach((k) => keys.handled.add(k));
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
