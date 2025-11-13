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

export type ObjectMapping = Omit<Strict<api.MappingObjectProperty>, 'properties'> & {
  type: 'object';
  properties: Record<string, AnyMapping>;
};

export type AnyPropertyBase = Omit<api.MappingPropertyBase, 'properties'> & {
  properties: Record<string, AnyMapping>;
};

export type ToPrimitives<O extends AnyPropertyBase> = {} extends O
  ? never
  : {
      [K in keyof O['properties']]: {} extends O['properties'][K]
        ? never
        : O['properties'][K] extends { type: infer T }
        ? T extends 'keyword'
          ? O['properties'][K] extends { enum: infer TEnums }
            ? TEnums extends Array<infer TEnum>
              ? TEnum
              : never
            : string
          : T extends 'text'
          ? string
          : T extends 'integer'
          ? number
          : T extends 'long'
          ? number
          : T extends 'short'
          ? number
          : T extends 'boolean'
          ? boolean
          : T extends 'date'
          ? O['properties'][K] extends { format: 'strict_date_optional_time' }
            ? string
            : string | number
          : T extends 'date_nanos'
          ? string
          : T extends 'object'
          ? O['properties'][K] extends AnyPropertyBase
            ? ToPrimitives<O['properties'][K]>
            : never
          : never
        : never;
    };

interface MappingsProperties {
  [x: string]: AnyMapping;
}

export interface MappingsDefinition {
  properties: MappingsProperties;
}

export type DocumentOf<
  D extends Record<K, MappingsDefinition> = Record<K, MappingsDefinition>,
  K extends string = 'mappings'
> = Partial<
  ToPrimitives<{
    type: 'object';
    properties: D[K]['properties'];
  }>
>;
