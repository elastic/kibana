/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type api from '@elastic/elasticsearch/lib/api/types';

export type StrictDynamic = false | 'strict';

type ToStrictMappingProperty<P extends api.MappingProperty> = Omit<P, 'properties'> & {
  dynamic?: StrictDynamic;
};

export type Strict<P extends api.MappingProperty> = ToStrictMappingProperty<P>;

export type StrictMappingTypeMapping = Strict<api.MappingTypeMapping>;

export type AnyMapping = Strict<api.MappingProperty>;
export type KeywordMapping = Strict<api.MappingKeywordProperty>;
export type TextMapping = Strict<api.MappingTextProperty>;
export type DateMapping = Strict<api.MappingDateProperty>;
export type DateNanosMapping = Strict<api.MappingDateNanosProperty>;
export type LongMapping = Strict<api.MappingLongNumberProperty>;
export type IntegerMapping = Strict<api.MappingIntegerNumberProperty>;
export type ShortMapping = Strict<api.MappingShortNumberProperty>;
export type BooleanMapping = Strict<api.MappingBooleanProperty>;
export type FlattenedMapping = Strict<api.MappingFlattenedProperty>;

export interface ObjectMapping extends Omit<Strict<api.MappingObjectProperty>, 'properties'> {
  type: 'object';
  properties: Record<string, AnyMapping>;
}

// Map ES data types to JavaScript types
export type StringMapping = KeywordMapping | TextMapping | DateMapping | DateNanosMapping;
