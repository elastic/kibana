# @kbn/index-adapter

Utility library for Elasticsearch index management.

## IndexAdapter

Manage single index. Example:

```
// Setup
const index = new IndexAdapter('my-awesome-index', { kibanaVersion: '8.12.1' });

index.setComponentTemplate({
    name: 'awesome-component-template',
    fieldMap: {
        'awesome.field1: { type: 'keyword', required: true },
        'awesome.nested.field2: { type: 'number', required: false },
        // ...
    },
});

index.setIndexTemplate({
    name: 'awesome-index-template',
    componentTemplateRefs: ['awesome-component-template', 'ecs-component-template'],
    template: {
        lifecycle: {
            data_retention: '5d',
        },
    },
});

// Start
await index.install({ logger, esClient, pluginStop$ }); // Installs templates and the index, or updates existing.
```


## IndexSpacesAdapter

Manage index per space. Example:

```
// Setup
const spacesIndex = new IndexSpacesAdapter('my-awesome-index', { kibanaVersion: '8.12.1' });

spacesIndex.setComponentTemplate({
    name: 'awesome-component-template',
    fieldMap: {
        'awesome.field1: { type: 'keyword', required: true },
        'awesome.nested.field2: { type: 'number', required: false },
        // ...
    },
});

spacesIndex.setIndexTemplate({
    name: 'awesome-index-template',
    componentTemplateRefs: ['awesome-component-template', 'ecs-component-template'],
    template: {
        lifecycle: {
            data_retention: '5d',
        },
    },
});

// Start
await spacesIndex.install({ logger, esClient, pluginStop$ }); // Installs templates and updates existing index.

// Create a space index on the fly
await spacesIndex.installSpace('space2'); // creates 'my-awesome-index-space2' index if it does not exist.
```
