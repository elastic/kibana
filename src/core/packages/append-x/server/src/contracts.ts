/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ObjectType, TypeOf, schema } from '@kbn/config-schema';
import type api from '@elastic/elasticsearch/lib/api/types';

type StrictDynamic = false | 'strict';

type StrictMappingProperty<O> = api.MappingProperty & {
  dynamic?: StrictDynamic;
  properties?: {
    [K in keyof O]: StrictMappingProperty<O[K] extends object ? StrictMappingProperty<O> : O[K]>;
  };
};

interface StrictMappingTypeMapping<O extends object = object> extends api.MappingTypeMapping {
  dynamic: StrictDynamic;
  properties?: {
    [K in keyof O]: StrictMappingProperty<O[K] extends object ? StrictMappingProperty<O> : O[K]>;
  };
}

interface BaseSchema {
  '@timestamp': string;
}

interface MappingsHelper {
  keyword: () => StrictMappingProperty<string>;
  text: () => StrictMappingProperty<string>;
  long: () => StrictMappingProperty<number>;
  object: <O extends object>(o: O) => StrictMappingProperty<O>;
}

interface CreateDataStreamHelpers {
  mappings: MappingsHelper;
}

type WithTimestamp<T extends ObjectType> = TypeOf<T>['@timestamp'] extends string ? T : never;

export interface AppendXServiceSetup {
  dataStream: <DocSchema extends ObjectType>(
    fn: (helpers: CreateDataStreamHelpers) => {
      name: string;
      schema: WithTimestamp<DocSchema>;
      mappings: StrictMappingTypeMapping<TypeOf<DocSchema>>;
    }
  ) => void;
}

const appendXSetup: AppendXServiceSetup = {} as any;

appendXSetup.dataStream(({ mappings }) => ({
  name: 'my-data-stream',
  schema: schema.object({
    '@timestamp': schema.string(),
    test: schema.object({
      test1: schema.string(),
      test2: schema.string(),
    }),
  }),
  mappings: {
    dynamic: false,
    properties: {
      '@timestamp': mappings.keyword(),
      test: mappings.object({
        test1: mappings.text(),
        test2: mappings.text(),
      }),
    },
  },
}));
