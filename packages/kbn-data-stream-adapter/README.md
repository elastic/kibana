# @kbn/data-stream-adapter

Utility library to for Elasticsearch data stream creation

## DataStreamAdapter

It creates a single data stream. Example:

```
// Instantiate
const dataStream = new DataStreamAdapter('my-awesome-datastream', { kibanaVersion: '8.12.1' });

// Define component and index templates
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

// Installs templates and data stream, or updates existing.
await dataStream.install({ logger, esClient, pluginStop$ }); 
```


## DataStreamSpacesAdapter

It creates space aware data streams. Example:

```
// Instantiate
const spacesDataStream = new DataStreamSpacesAdapter('my-awesome-datastream', { kibanaVersion: '8.12.1' });

// Define component and index templates
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

// Installs templates and updates existing data streams.
await spacesDataStream.install({ logger, esClient, pluginStop$ }); 

// After installation we can create space-aware data streams on runtime.
await spacesDataStream.installSpace('space2'); // creates `my-awesome-datastream-space2` if it does not exist
```
