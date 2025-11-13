/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defaultsDeep, merge, extend } from 'lodash';

import type {
  DateMapping,
  KeywordMapping,
  TextMapping,
  DateNanosMapping,
  IntegerMapping,
  LongMapping,
  ShortMapping,
  BooleanMapping,
  FlattenedMapping,
  ObjectMapping,
} from './types';

type WithoutTypeField<T> = Omit<T, 'type'>;

const isSet = <T extends Record<string, any>>(def: T | undefined, key: string): def is T =>
  Object.keys(def ?? {}).includes(key);

export const omitUnsetKeys = <T>(
  defaults: Record<string, unknown>,
  def?: Record<string, unknown>
): T => {
  return extend<T>({}, defaults, def, (objValue: unknown, _: unknown, key: string) => {
    if (isSet(def, key) && objValue === undefined) {
      return undefined;
    }
    return objValue;
  });
};

export function object(
  properties: ObjectMapping['properties'],
  def?: WithoutTypeField<ObjectMapping>
): ObjectMapping {
  const defaults: ObjectMapping = omitUnsetKeys(
    {
      type: 'object',
    },
    def
  );

  return defaultsDeep(def, defaults, { properties });
}

export function text(def?: WithoutTypeField<TextMapping>): TextMapping {
  const defaults: TextMapping = omitUnsetKeys(
    {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
    def
  );

  return merge(defaults, def);
}

export function keyword(def?: WithoutTypeField<KeywordMapping>): KeywordMapping {
  const defaults: KeywordMapping = omitUnsetKeys(
    {
      type: 'keyword',
      ignore_above: 1024,
    },
    def
  );
  return defaultsDeep(def, defaults);
}

export function date(def?: WithoutTypeField<DateMapping>): DateMapping {
  const defaults: DateMapping = omitUnsetKeys(
    {
      type: 'date',
    },
    def
  );
  return defaultsDeep(def, defaults);
}

export function dateNanos(def?: WithoutTypeField<DateNanosMapping>): DateNanosMapping {
  const defaults: DateNanosMapping = omitUnsetKeys(
    {
      type: 'date_nanos',
    },
    def
  );
  return defaultsDeep(def, defaults);
}

export function integer(def?: WithoutTypeField<IntegerMapping>): IntegerMapping {
  const defaults: IntegerMapping = omitUnsetKeys(
    {
      type: 'integer',
    },
    def
  );
  return defaultsDeep(def, defaults);
}

export function long(def?: WithoutTypeField<LongMapping>): LongMapping {
  const defaults: LongMapping = omitUnsetKeys(
    {
      type: 'long',
    },
    def
  );
  return defaultsDeep(def, defaults);
}

export function short(def?: WithoutTypeField<ShortMapping>): ShortMapping {
  const defaults: ShortMapping = omitUnsetKeys(
    {
      type: 'short',
    },
    def
  );
  return defaultsDeep(def, defaults);
}

export function boolean(def?: WithoutTypeField<BooleanMapping>): BooleanMapping {
  const defaults: BooleanMapping = omitUnsetKeys(
    {
      type: 'boolean',
    },
    def
  );
  return defaultsDeep(def, defaults);
}

export function flattened(def?: WithoutTypeField<FlattenedMapping>): FlattenedMapping {
  const defaults: FlattenedMapping = omitUnsetKeys(
    {
      type: 'flattened',
    },
    def
  );

  return defaultsDeep(def, defaults);
}
