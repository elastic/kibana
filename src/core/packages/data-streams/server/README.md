# @kbn/core-data-streams-server

## Motivation

While its possible to use `@kbn/data-streams` as a standalone package by passing an appropriate `esClient` object during `inititalize()` (to handle communication with Elasticsearch), the core data streams service allows for a coordinated initialization of your data stream indices as part of the `CoreSetup` and `CoreStart` plugin initalization routine.

Some additional benefits to using the core data streams service:

- You no longer have to pass the privileged kibana es client (`core.elasticsearch.client.asInternalUser`), but can rely on the internal behavior of this service during `initializeAllDataStreams()` which will take care of passing it as soon as its available.
- Core can coordinate updates to existing data streams a bit better i.e. avoid a flood of requests from multi Kibana clusters
- Change detection data streams are easier to detect/keep track of via Core registrations

## Examples

Please refer to [examples/data_streams_example/server/index.ts](../../../../../examples/data_streams_example/server/index.ts)

```ts
export const plugin = (ctx: PluginInitializerContext) => {
  return {
    setup({ dataStreams }: CoreSetup) {
      dataStreams.registerDataStream(dataStream);
    },
    start({ dataStreams }: CoreStart) {
      const initializeClient = async () => {
        return await dataStreams.initializeClient<typeof dataStreamMappings, DataStreamDocument>(
          dataStream.name
        );
      };
      return {
        createSpecialDocument: async () => {
          const client = await initializeClient();
          const document: DataStreamDocument = {
            '@timestamp': +new Date(),
            name: 'John Doe',
            description: 'This is a test document for my data stream.',
            age: 30,
            unMappedField: 'Unmapped field but exists in the document _source',
          };

          const result = await client.create({
            documents: [document],
          });

          ctx.logger.get('data-streams-example').info(JSON.stringify(result, null, 2));
        },
        getDocument: async (id: string) => {
          const client = await initializeClient();

          const result = await client.search({
            query: {
              term: { description: 'This is a test document for my data stream.' },
            },
          });

          return result;
        },
      };
    },
    stop() {},
  };
};
```