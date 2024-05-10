# @kbn/data-stream-adapter

Utility library for Elasticsearch data stream management.

## DataStreamAdapter

Manage single data streams. Example:

```
// Setup
const dataStream = new DataStreamAdapter('my-awesome-datastream', { kibanaVersion: '8.12.1' });

dataStream.setComponentTemplate({
    name: 'awesome-component-template',
    fieldMap: {
        'awesome.field1: { type: 'keyword', required: true },
        'awesome.nested.field2: { type: 'number', required: false },
        // ...
    },
});

dataStream.setIndexTemplate({
    name: 'awesome-index-template',
    componentTemplateRefs: ['awesome-component-template', 'ecs-component-template'],
    template: {
        lifecycle: {
            data_retention: '5d',
        },
    },
});

// Start
await dataStream.install({ logger, esClient, pluginStop$ }); // Installs templates and the data stream, or updates existing.
```


## DataStreamSpacesAdapter

Manage data streams per space. Example:

```
// Setup
const spacesDataStream = new DataStreamSpacesAdapter('my-awesome-datastream', { kibanaVersion: '8.12.1' });

spacesDataStream.setComponentTemplate({
    name: 'awesome-component-template',
    fieldMap: {
        'awesome.field1: { type: 'keyword', required: true },
        'awesome.nested.field2: { type: 'number', required: false },
        // ...
    },
});

spacesDataStream.setIndexTemplate({
    name: 'awesome-index-template',
    componentTemplateRefs: ['awesome-component-template', 'ecs-component-template'],
    template: {
        lifecycle: {
            data_retention: '5d',
        },
    },
});

// Start
await spacesDataStream.install({ logger, esClient, pluginStop$ }); // Installs templates and updates existing data streams.

// Create a space data stream on the fly
await spacesDataStream.installSpace('space2'); // creates 'my-awesome-datastream-space2' data stream if it does not exist.
```
