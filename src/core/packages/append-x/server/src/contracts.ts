/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Type, TypeOf, schema } from '@kbn/config-schema';
import type { Client } from '@elastic/elasticsearch';
import type api from '@elastic/elasticsearch/lib/api/types';

// Example usage...

/**
 * Outstanding points:
 *
 * 1. How should we handle updating mappings? Do we just apply to the index template or go and update the existing write index as well?
 * 2. Lazy creation, but eager update of mappings to existing data streams
 *    2.1. With option to eagerly create for when we know the data stream will be used, failing Kibana startup if data stream cannot be created.
 *    2.2. Data stream deletion a future possibility
 * 3. Data streams for CRUD-like use cases: specifically updates
 *    3.1. Likely a future phase (requires updating underlying index)
 *    3.2. Consider removing possibility to control IDs at doc creation
 * 4. We need guidance for teams to mostly be able to self-service their management/creation of data streams.
 *    4.1. We can largely rely on convention to start with: write a Jest integration test and take a snapshot of the serialized data stream declaration that you want to ship. Note: once merged these test snapshots should never change in a breaking way...
 */

const dataStream: DataStreamHelpers = {} as any; // static functions to help declare and manage data streams.
const mappings: MappingsHelpers = {} as any; // static functions to help declare mappings for data streams.
const appendXSetup: AppendXServiceSetup = {} as any;
const appendXStart: AppendXServiceStart = {} as any;

const esClient: Client = {} as any;
const integrationTestHelpers: JestIntegrationTestHelpers = {} as any;

/**
 * A type checked schema and mappings declaration similar to SOs.
 *
 * My assumption is that this one declaration will/can only evolve in bwc ways. To "break" this data stream you will need
 * to create a new one, with a new name.
 */
const myDocumentSchema = schema.object({
  '@timestamp': schema.string(),
  object: schema.object({
    test: schema.string(),
  }),
  someField: schema.string(),
  someFieldV2: schema.maybe(schema.string()), // This is a new field that will be runtime mapped, so searchable/aggable...
});

type MyDocument = TypeOf<typeof myDocumentSchema>;

const myDataStream: DataStreamDefinition<MyDocument> = {
  name: 'my-data-stream',
  schema: myDocumentSchema,
  mappings: {
    dynamic: false,
    properties: {
      '@timestamp': mappings.date(),
      object: {
        type: 'object',
        properties: {
          test: mappings.text(),
        },
      },
    },
  },
  searchRuntimeMappings: {
    // full declaration, or you could write:
    // someFieldV2: mappings.searchRuntimeMappings.remap({
    //   previousFieldName: 'someField',
    //   fieldName: 'someFieldV2',
    //   type: 'keyword',
    // }),
    someFieldV2: {
      type: 'keyword',
      script: {
        source: `
  // return what we have in source if there is something in source
  if (params._source["someFieldV2"] != null) {
    emit(params._source["someFieldV2"]);
  } else  { // return the original processed in some way
    emit(doc['someField'].value + " the original, but processed");
  }
`,
      },
    },
  },
};

// This could be a nice way to expose the "low-level" requests we are making so that
// the data stream abstraction feels more like a thin helper or layer around the
// the Elasticsearch APIs. Intended to be used by plugin developers for test
// authoring purposes.
esClient.indices.putIndexTemplate(dataStream.asPutIndexTemplateRequestArgs(myDataStream));
esClient.indices.createDataStream(dataStream.asCreateDataStreamRequestArgs(myDataStream));

// Register your data stream with the AppendX service
appendXSetup.registerDataStream(myDataStream);

// Searching
// const client = appendXStart.client.scopeTo<TDoc>(myDataStream, myDataStream2, myDataStream3);
// const result = await client.search({...}) // ES API

// Authoring integ tests

const previousDeclaration: DataStreamDefinition<MyDocument> = {
  name: 'my-data-stream',
  schema: myDocumentSchema,
  mappings: {
    dynamic: false,
    properties: {
      '@timestamp': mappings.date(),
      object: {
        type: 'object',
        properties: {
          test: mappings.text(),
        },
      },
    },
  },
  searchRuntimeMappings: {
    someFieldV2: {
      type: 'keyword',
      script: {
        source: `
  // return what we have in source if there is something in source
  if (params._source["someFieldV2"] != null) {
    emit(params._source["someFieldV2"]);
  } else  { // return the original processed in some way
    emit(doc['someFieldV2'].value + " the original, but processed");
  }
`,
      },
    },
  },
};

test('myDataStream should be backwards compatible', async () => {
  await integrationTestHelpers.assertBackwardsCompatible(previousDeclaration, myDataStream);
});

// Type shenanigans

type StrictDynamic = false | 'strict';

type ToStrictMappingProperty<P extends api.MappingProperty> = Omit<P, 'properties'> & {
  dynamic?: StrictDynamic;
};

type Strict<P extends api.MappingProperty> = ToStrictMappingProperty<P>;

type StrictMappingTypeMapping = Strict<api.MappingTypeMapping>;

type KeywordMapping = Strict<api.MappingKeywordProperty>;
type TextMapping = Strict<api.MappingTextProperty>;
type DateMapping = Strict<api.MappingDateProperty>;
type DateNanosMapping = Strict<api.MappingDateNanosProperty>;

type StringMapping = KeywordMapping | TextMapping | DateMapping | DateNanosMapping;

interface JestIntegrationTestHelpers {
  assertBackwardsCompatible: (...dataStream: DataStreamDefinition[]) => void;
}

interface MappingsHelpers {
  date: () => KeywordMapping;
  keyword: () => KeywordMapping;
  text: () => TextMapping;
  // Helpers for declaring runtime fields
  searchRuntimeMappings: {
    remap: (args: {
      previousFieldName: string;
      fieldName: string;
      type: api.MappingRuntimeFieldType;
    }) => api.MappingRuntimeField;
  };
}

type DataStreamDeclarationMappings<Schema extends Record<string, unknown>> = Pick<
  Omit<StrictMappingTypeMapping, 'properties'> & {
    properties: ObjectToPropertiesDefinition<Schema>;
  },
  'dynamic' | 'properties'
>;

interface DataStreamDefinition<Schema extends Record<string, unknown> = {}> {
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

  // https://www.elastic.co/docs/manage-data/data-store/mapping/define-runtime-fields-in-search-request
  searchRuntimeMappings?: {
    [K in keyof Schema]?: api.MappingRuntimeField;
  };
}

interface DataStreamHelpers {
  asPutIndexTemplateRequestArgs(ds: DataStreamDefinition): api.IndicesPutIndexTemplateRequest;
  asCreateDataStreamRequestArgs(ds: DataStreamDefinition): api.IndicesCreateDataStreamRequest;
}

export interface AppendXServiceSetup {
  registerDataStream: (dataStream: DataStreamDefinition) => void;
}

export interface AppendXServiceStart {
  getClient<Schema extends Record<string, unknown>>(
    dataStream: DataStreamDefinition<Schema>
  ): {
    search: (req: Omit<api.SearchRequest, 'index'>) => Promise<api.SearchResponse<unknown>>; // For TS schema to hold true we must merge `fields` into `_source`...
    searchMergeFields: (
      req: Omit<api.SearchRequest, 'index'>
    ) => Promise<api.SearchResponse<Schema>>; // For TS schema to hold true we must merge `fields` into `_source`...
    index: (req: Omit<api.IndexRequest, 'index'>) => Promise<api.IndexResponse>;
    delete: (req: Omit<api.DeleteRequest, 'index'>) => Promise<api.DeleteResponse>;
  };
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
