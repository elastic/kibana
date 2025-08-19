/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defaultsDeep } from 'lodash';

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
} from './types';

type WithoutTypeField<T> = Omit<T, 'type'>;

export function text(def?: WithoutTypeField<TextMapping>): TextMapping {
  const defaults: TextMapping = {
    type: 'text',
    fields: {
      keyword: {
        type: 'keyword',
        ignore_above: 1024,
      },
    },
  };
  return defaultsDeep(def, defaults);
}

export function keyword(def?: WithoutTypeField<KeywordMapping>): KeywordMapping {
  const defaults: KeywordMapping = {
    type: 'keyword',
    ignore_above: 1024,
  };
  return defaultsDeep(def, defaults);
}

export function date(def?: WithoutTypeField<DateMapping>): DateMapping {
  const defaults: DateMapping = {
    type: 'date',
  };
  return defaultsDeep(def, defaults);
}

export function dateNanos(def?: WithoutTypeField<DateNanosMapping>): DateNanosMapping {
  const defaults: DateNanosMapping = {
    type: 'date_nanos',
  };
  return defaultsDeep(def, defaults);
}

export function integer(def?: WithoutTypeField<IntegerMapping>): IntegerMapping {
  const defaults: IntegerMapping = {
    type: 'integer',
  };
  return defaultsDeep(def, defaults);
}

export function long(def?: WithoutTypeField<LongMapping>): LongMapping {
  const defaults: LongMapping = {
    type: 'long',
  };
  return defaultsDeep(def, defaults);
}

export function short(def?: WithoutTypeField<ShortMapping>): ShortMapping {
  const defaults: ShortMapping = {
    type: 'short',
  };
  return defaultsDeep(def, defaults);
}

export function boolean(def?: WithoutTypeField<BooleanMapping>): BooleanMapping {
  const defaults: BooleanMapping = {
    type: 'boolean',
  };
  return defaultsDeep(def, defaults);
}

export function flattened(def?: WithoutTypeField<FlattenedMapping>): FlattenedMapping {
  const defaults: FlattenedMapping = {
    type: 'flattened',
  };
  return defaultsDeep(def, defaults);
}
