/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Type } from '@kbn/config-schema';
import type api from '@elastic/elasticsearch/lib/api/types';

type StrictDynamic = false | 'strict';

type ToStrictMappingProperty<P extends api.MappingProperty> = Omit<P, 'properties'> & {
  dynamic?: StrictDynamic;
};

type Strict<P extends api.MappingProperty> = ToStrictMappingProperty<P>;

type KeywordMapping = Strict<api.MappingKeywordProperty>;
type TextMapping = Stritt<api.MappingTextProperty>;

type StringMapping = KeywordMapping | TextMapping;

interface MappingsHelpers {
  keyword: () => KeywordMapping;
  text: () => TextMapping;
}

interface Field<T> {
  type: T;
}

type AnyField = Field<unknown>;

interface StringField extends Field<'string'> {
  type: 'string';
  mapping?: KeywordMapping | TextMapping;
  validate: Type<string>;
}

type Props = Record<string, AnyField>;

interface ObjectField<O extends Props> extends Field<'object'> {
  type: 'object';
  mapping?: { dynamic?: StrictDynamic };
  properties: O;
}

interface FieldHelperOptions<Mapping extends Strict<api.MappingProperty>> {
  mapping?: Mapping;
}

interface FieldsHelpers {
  string: (opts?: FieldHelperOptions<StringMapping>) => StringField;
  object: <P extends Props>(props: P) => ObjectField<P>;
}

interface CreateDataStreamHelpers {
  mappings: MappingsHelpers;
  fields: FieldsHelpers;
}

export interface AppendXServiceSetup {
  dataStream: (
    fn: <O extends Props>(
      helpers: CreateDataStreamHelpers
    ) => {
      name: string;
      fields: ObjectField<O>;
    }
  ) => void;
}

const appendXSetup: AppendXServiceSetup = {} as any;

appendXSetup.dataStream(({ fields, mappings }) => ({
  name: 'my-data-stream',
  fields: fields.object({
    '@timestamp': fields.string({ mapping: mappings.keyword() }),
  }),
}));
