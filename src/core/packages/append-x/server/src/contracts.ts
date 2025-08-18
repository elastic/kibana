/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client, TransportRequestOptionsWithOutMeta } from '@elastic/elasticsearch';
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
const searchRuntimeHelpers: SearchRuntimeMappingsHelpers = {} as any; // static functions to help declare mappings for data streams.
const dataStreamsSetup: DataStreamsSetup = {} as any;
const dataStreamsStart: DataStreamsStart = {} as any;
const log: any = {} as any;

const esClient: Client = {} as any;
const integrationTestHelpers: JestIntegrationTestHelpers = {} as any;

interface MyDocumentSchema {
  '@timestamp': string;
  object: {
    test: string;
  };
  someField: string;
  someFieldV2?: string;
}

const searchRuntimeMappings = {
  someFieldV2: searchRuntimeHelpers.remap({
    previousFieldName: 'someField',
    fieldName: 'someFieldV2',
    type: 'keyword',
  }),
  // full declaration
  someFieldV3: {
    type: 'keyword',
    script: {
      source: `
  // return what we have in source if there is something in source
  if (params._source["someFieldV2"] != null) {
    emit(params._source["someFieldV2"]);
  } else  { // return the original value
    emit(doc['someField'].value);
  }
`,
    },
  },
} satisfies BaseSearchRuntimeMappings;

const myDataStream: DataStreamDefinition<MyDocumentSchema, typeof searchRuntimeMappings> = {
  name: 'my-data-stream',
  mappings: {
    dynamic: false,
    properties: {
      '@timestamp': mappings.date(),
      someField: mappings.text(),
      object: {
        type: 'object',
        properties: {
          test: mappings.text(),
        },
      },
    },
  },
  searchRuntimeMappings,
};

// This could be a nice way to expose the "low-level" requests we are making so that
// the data stream abstraction feels more like a thin helper or layer around the
// the Elasticsearch APIs. Intended to be used by plugin developers for test
// authoring purposes.
esClient.indices.putIndexTemplate(dataStream.asPutIndexTemplateRequestArgs(myDataStream));
esClient.indices.createDataStream(dataStream.asCreateDataStreamRequestArgs(myDataStream));

// Register your data stream with the dataStreams service
dataStreamsSetup.registerDataStream(myDataStream);

//* ************************************************ Searching
// dataStream.getClient();
const client = dataStreamsStart.getClient(myDataStream);
const { helpers } = client;
client
  .search({
    fields: ['someFieldV2'],
  })
  .then((result) => {
    log.info(result.hits.hits[0]._source?.someField);
    log.info(helpers.getFieldsFromSearchResponse(result).someFieldV2);
  });
// const result = await client.search({...}) // ES API

// Index template metadata
/**
 * { _meta: { version: "{hash-3}", previous_version: ["hash-1", "hash-2"] } }
 */

//* ************************************************ Authoring integ tests
// integration_tests/previous_datastreams.fixtures.ts
const v1: DataStreamDefinition<MyDocumentSchema> = {
  name: 'my-data-stream',
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
  } else  { // return the original value
    emit(doc['someField'].value);
  }
`,
      },
    },
  },
};

// integration_tests/my_data_stream.test.ts
const current = myDataStream;

test('myDataStream should be backwards compatible', async () => {
  await integrationTestHelpers.assertBackwardsCompatible([
    {
      sampleDocs: [
        {
          /* 1 */
        },
        // and so on...
      ],
      dataStream: v1,
    },
    {
      sampleDocs: [
        {
          /* 1 */
        },
        // and so on...
      ],
      dataStream: current,
    },
  ]);
});

test('snapshot', async () => {
  expect(integrationTestHelpers.toSnapshot(myDataStream)).toMatchSnapshot();
});

test('mappings hash v1', async () => {
  expect(integrationTestHelpers.mappingsHash(myDataStream)).toMatchInlineSnapshot(`hash-1`);
});

//* ************************************************ Type shenanigans

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
  assertBackwardsCompatible: (
    definitions: Array<{
      sampleDocs: Array<Record<string, unknown>>;
      dataStream: DataStreamDefinition;
    }>
  ) => Promise<void>;
  toSnapshot: (...dataStream: DataStreamDefinition[]) => void;
  mappingsHash: (dataStream: DataStreamDefinition) => string;
}

interface MappingsHelpers {
  date: () => KeywordMapping;
  keyword: () => KeywordMapping;
  text: () => TextMapping;
}

interface SearchRuntimeMappingsHelpers {
  remap: (args: {
    previousFieldName: string;
    fieldName: string;
    type: api.MappingRuntimeFieldType;
  }) => api.MappingRuntimeField;
}

type DataStreamDeclarationMappings<Schema extends {}> = Pick<
  Omit<StrictMappingTypeMapping, 'properties'> & {
    properties: ObjectToPropertiesDefinition<Schema>;
  },
  'dynamic' | 'properties'
>;

interface BaseSearchRuntimeMappings {
  [objectPath: string]: api.MappingRuntimeField;
}

interface DataStreamDefinition<
  Schema extends {} = {},
  SearchRuntimeMappings extends BaseSearchRuntimeMappings = {}
> {
  /**
   * @remark Once released this should never change.
   */
  name: string;

  mappings?: DataStreamDeclarationMappings<Schema>;

  // https://www.elastic.co/docs/manage-data/data-store/mapping/define-runtime-fields-in-search-request
  searchRuntimeMappings?: SearchRuntimeMappings;
}

interface DataStreamHelpers {
  createDefinition: <S extends Record<string, unknown>, SRM extends BaseSearchRuntimeMappings>(
    ds: DataStreamDefinition<S, SRM>
  ) => DataStreamDefinition<S, SRM>;
  asPutIndexTemplateRequestArgs(ds: DataStreamDefinition): api.IndicesPutIndexTemplateRequest;
  asCreateDataStreamRequestArgs(ds: DataStreamDefinition): api.IndicesCreateDataStreamRequest;
}

// Data client

interface SearchRequestImproved<SearchRuntimeMappings extends BaseSearchRuntimeMappings = {}>
  extends Omit<api.SearchRequest, 'index' | 'fields'> {
  fields?: Array<keyof SearchRuntimeMappings>;
}

export interface DataStreamsSetup {
  registerDataStream: (dataStream: DataStreamDefinition) => void;
}

export interface DataStreamsStart {
  getClient<S extends {}, SRM extends BaseSearchRuntimeMappings>(
    dataStream: DataStreamDefinition<S, SRM>
  ): {
    search: <Agg extends Record<string, api.AggregationsAggregate> = {}>(
      req: SearchRequestImproved<SRM>,
      transportOpts?: TransportRequestOptionsWithOutMeta
    ) => Promise<api.SearchResponse<S, Agg>>;

    index: (req: Omit<api.IndexRequest, 'index'>) => Promise<api.IndexResponse>;
    // delete: (req: Omit<api.DeleteRequest, 'index'>) => Promise<api.DeleteResponse>;
    helpers: {
      getFieldsFromSearchResponse: (response: api.SearchResponse) => {
        [key in keyof SRM]: unknown[];
      };
    };
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
