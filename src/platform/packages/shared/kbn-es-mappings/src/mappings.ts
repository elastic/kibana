/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { merge } from 'lodash';

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
import { omitUnsetKeys } from './utils';
import type { WithoutTypeField } from './types_helpers';

export function object<T>(def: WithoutTypeField<ObjectMapping<T>>): ObjectMapping<T> {
  const defaults: ObjectMapping = omitUnsetKeys(
    {
      type: 'object',
    },
    def
  );

  return merge(defaults, def);
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
  return merge(defaults, def);
}

export function date(def?: WithoutTypeField<DateMapping>): DateMapping {
  const defaults: DateMapping = omitUnsetKeys(
    {
      type: 'date',
    },
    def
  );
  return merge(defaults, def);
}

export function dateNanos(def?: WithoutTypeField<DateNanosMapping>): DateNanosMapping {
  const defaults: DateNanosMapping = omitUnsetKeys(
    {
      type: 'date_nanos',
    },
    def
  );
  return merge(defaults, def);
}

export function integer(def?: WithoutTypeField<IntegerMapping>): IntegerMapping {
  const defaults: IntegerMapping = omitUnsetKeys(
    {
      type: 'integer',
    },
    def
  );
  return merge(defaults, def);
}

export function long(def?: WithoutTypeField<LongMapping>): LongMapping {
  const defaults: LongMapping = omitUnsetKeys(
    {
      type: 'long',
    },
    def
  );
  return merge(defaults, def);
}

export function short(def?: WithoutTypeField<ShortMapping>): ShortMapping {
  const defaults: ShortMapping = omitUnsetKeys(
    {
      type: 'short',
    },
    def
  );
  return merge(defaults, def);
}

export function boolean(def?: WithoutTypeField<BooleanMapping>): BooleanMapping {
  const defaults: BooleanMapping = omitUnsetKeys(
    {
      type: 'boolean',
    },
    def
  );
  return merge(defaults, def);
}

export function flattened(def?: WithoutTypeField<FlattenedMapping>): FlattenedMapping {
  const defaults: FlattenedMapping = omitUnsetKeys(
    {
      type: 'flattened',
    },
    def
  );

  return merge(defaults, def);
}
