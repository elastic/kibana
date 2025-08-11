/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Type, schema } from '@kbn/config-schema';
import type { Client } from '@elastic/elasticsearch';
import type api from '@elastic/elasticsearch/lib/api/types';

// Example usage...

const dataStream: DataStreamHelpers = {} as any; // static functions to help declare and manage data streams.
const mappings: MappingsHelpers = {} as any; // static functions to help declare mappings for data streams.
const esClient: Client = {} as any;
const appendXSetup: AppendXServiceSetup = {} as any;

/**
 * A type checked schema and mappings declaration similar to SOs, but tried to be a bit simpler. With the current typings
 * we can also check that you provide, for ex., keyword/text mappings for
 * string fields.
 *
 * My assumption is that this one declaration will/can only evolve in bwc ways. To "break" this data stream you will need
 * to create a new one, with a new name.
 */
const myDataStream = dataStream.create({
  name: 'my-data-stream-1',
  schema: schema.object({
    '@timestamp': schema.string(),
    object: schema.object({}),
    someField: schema.string(),
  }),
  mappings: {
    dynamic: false,
    properties: {
      '@timestamp': mappings.keyword(),
    },
  },
  migrations: {
    '1': {
      operations: [{ type: 'backfill_last', duration: '30d' }],
    },
  },
});

// This could be a nice way to expose the "low-level" requests we are making so that
// the data stream abstraction feels more like a thin helper or layer around the
// the Elasticsearch APIs.
esClient.indices.putIndexTemplate(dataStream.asPutIndexTemplateRequestArgs(myDataStream));
esClient.indices.createDataStream(dataStream.asCreateDataStreamRequestArgs(myDataStream));

// Register your data stream with the AppendX service
appendXSetup.registerDataStream(myDataStream);

// Type shenanigans

type StrictDynamic = false | 'strict';

type ToStrictMappingProperty<P extends api.MappingProperty> = Omit<P, 'properties'> & {
  dynamic?: StrictDynamic;
};

type Strict<P extends api.MappingProperty> = ToStrictMappingProperty<P>;

type StrictMappingTypeMapping = Strict<api.MappingTypeMapping>;

type KeywordMapping = Strict<api.MappingKeywordProperty>;
type TextMapping = Strict<api.MappingTextProperty>;

type StringMapping = KeywordMapping | TextMapping;

interface MappingsHelpers {
  keyword: () => KeywordMapping;
  text: () => TextMapping;
}

type DataStreamDeclarationMappings<Schema extends Record<string, unknown>> = Omit<
  StrictMappingTypeMapping,
  'properties'
> & {
  properties: ObjectToPropertiesDefinition<Schema>;
};

interface Migration {
  operations: Array<
    | { type: 'backfill_last'; duration: '30d' }
    // Theoretically we can figure this out from the declarations...
    | { type: 'add_mappings'; subsetOfNewMappings: Record<string, unknown> }
    | { type: 'etc'; data: unknown } // TODO: define more migrations}
  >;
}

interface DataStreamDeclaration<Schema extends Record<string, unknown> = {}> {
  /**
   * @remark Once delcared this can never change.
   */
  name: string;
  /**
   * @remark By default this schema is applied in a forward compatible way. Unknown
   *         fields are stripped when read into Kibana memory from the client.
   */
  schema: Type<Schema>;
  mappings?: DataStreamDeclarationMappings<Schema>;

  /**
   * A set of migrations to run. Progress of migrations will likely be tracked in
   * data stream meta...
   */
  migrations?: {
    '1': Migration;
    '2'?: Migration;
    '3'?: Migration;
    '4'?: Migration;
    '6'?: Migration;
    '7'?: Migration;
    '8'?: Migration;
    '9'?: Migration;
    '10'?: Migration;
    '11'?: Migration;
  };
}

interface DataStreamHelpers {
  create: <Schema extends Record<string, unknown>>(
    arg: DataStreamDeclaration<Schema>
  ) => DataStreamDeclaration<Schema>;
  asPutIndexTemplateRequestArgs(ds: DataStreamDeclaration): api.IndicesPutIndexTemplateRequest;
  asCreateDataStreamRequestArgs(ds: DataStreamDeclaration): api.IndicesCreateDataStreamRequest;
}

export interface AppendXServiceSetup {
  registerDataStream: (dataStream: DataStreamDeclaration) => void;
}

// An attempt at getting TS to check mapping properties match the schema
type ObjectToPropertiesDefinition<O extends Record<string, unknown>> = {
  [K in keyof O]?: {} extends O[K]
    ? never
    : O[K] extends Record<string, unknown>
    ? Omit<Strict<api.MappingObjectProperty>, 'properties'> & {
        type: 'object';
        properties: ObjectToPropertiesDefinition<O[K]>;
      }
    : O[K] extends string
    ? StringMapping
    : Strict<api.MappingProperty>;
};
