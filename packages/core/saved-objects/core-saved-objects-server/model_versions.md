# savedObjects: Model Version API

## Introduction

The modelVersion API is a new way to define transformations (*"migrations"*) for your savedObject types, and will 
replace the "old" migration API after Kibana version `8.10.0` (where it will no longer be possible to register 
migrations using the old system).

The main purpose of this API is to address two problems of the old migration system regarding managed ("serverless") deployments:
- savedObjects model versioning is coupled to the stack versioning (migrations are registered per stack version)
- migration functions are not safe in regard to our BWC and ZDT requirements (Kibana N and N+1 running at the same time during upgrade)

This API also intend to address minor DX issues of the old migration system, by having a more explicit definition of saved Objects "versions".

### What are model versions trying to solve?

As explained in the previous section, 

### 1. SO type version was tightly coupled to stack versioning

With the previous migration system, migrations were defined per stack version. If that was sufficient for
on-prem distributions, as there was no way to upgrade Kibana to another else than a fixed stack version,
it isn't the case for our managed offering, where we're planning on delivering more often, decoupling
distribution and upgrade from the stack versions we know today.

This requirement introduces a lot of problems, limitations and edge case regarding 'incremental releases' within a
given stack version that the previous migration system wasn't conceive to support.

### 2. The current migrations API is unsafe for the zero-downtime and backward-compatible requirements

Until now, upgrading Kibana was done with downtime: the current upgrade process requires to shut down all the existing
nodes before deploying the new version, to avoid any risk of data or API incompatibility. That way, there is always
a single version of Kibana running at a given time.

For serverless, we need to be able to upgrade Kibana without interruption of service, meaning that the old and new
version of Kibana will have to cohabitate for a time. This leads to a lot of problems and subtlety in term of what
can, or cannot, be done in term of data transformation during an upgrade, and, long story short, the existing
migration API (which basically allows to do any kind of 1-1 document transformation) was way too permissive and
unsafe given our serverless requirements. 

## What does this API looks like

When registering a savedObject type, a new [modelVersions](https://github.com/elastic/kibana/blob/9a6a2ccdff619f827b31c40dd9ed30cb27203da7/packages/core/saved-objects/core-saved-objects-server/src/saved_objects_type.ts#L138-L177)

This attribute is a [SavedObjectsModelVersionMap](https://github.com/elastic/kibana/blob/9a6a2ccdff619f827b31c40dd9ed30cb27203da7/packages/core/saved-objects/core-saved-objects-server/src/model_version/model_version.ts#L60-L77)
which is a map of [SavedObjectsModelVersion](https://github.com/elastic/kibana/blob/9a6a2ccdff619f827b31c40dd9ed30cb27203da7/packages/core/saved-objects/core-saved-objects-server/src/model_version/model_version.ts#L12-L20)

This map follows a similar `version => model` format as the old migration map, however there are differences:

### 1. Versions are now plain numbers

A given SO type's model version is now identified by a single integer. The first version being number 1, and then normally
incremented by one for each new version. 

That way:
- SO type versions are decoupled from stack versioning
- SO type versions is independent between types (e.g dashboard version has no relation with maps version)

#### Versioning examples

*a **valid** version numbering:*
```ts
const myType: SavedObjectsType = {
  name: 'test',
  switchToModelVersionAt: '8.10.0',
  modelVersions: {
    1: modelVersion1,
    2: modelVersion2,
  },
  // ...other mandatory properties
};
```

*an **invalid** version numbering:*
```ts
const myType: SavedObjectsType = {
  name: 'test',
  switchToModelVersionAt: '8.10.0',
  modelVersions: {
    2: modelVersion2, // <== invalid: first version should be 1
    3: modelVersion3,
  },
  // ...other mandatory properties
};
```

*another **invalid** version numbering:*
```ts
const myType: SavedObjectsType = {
  name: 'test',
  switchToModelVersionAt: '8.10.0',
  modelVersions: {
    1: modelVersion1, 
    3: modelVersion3, // <== invalid: skipped version 2
  },
  // ...other mandatory properties
};
```

### 2. model versions define more than just a migration function

[Model versions](https://github.com/elastic/kibana/blob/9b330e493216e8dde3166451e4714966f63f5ab7/packages/core/saved-objects/core-saved-objects-server/src/model_version/model_version.ts#L12-L20)
are not just a function as the previous migrations were, but a object defining all the info related to the version.

It's currently composed of:

- [`changes`](https://github.com/elastic/kibana/blob/9b330e493216e8dde3166451e4714966f63f5ab7/packages/core/saved-objects/core-saved-objects-server/src/model_version/model_version.ts#L21-L51)

The list of changes applied during this version. This is the part that replaces the old migration system, and allows
to define when a version adds new mapping, mutates the documents, or other type-related changes.

The current types of changes are:

#### mappings_addition
#### mappings_deprecation
#### data_backfill

- [`schemas`](https://github.com/elastic/kibana/blob/9b330e493216e8dde3166451e4714966f63f5ab7/packages/core/saved-objects/core-saved-objects-server/src/model_version/schemas.ts#L11-L16)

The schemas associated with this version. Schemas are used to validate or convert the shape of SO documents are various
stages of their lifecycle.

The currently available schemas are:

#### forwardCompatibility

This is a new concept introduced by model versions. This schema is used for inter-version compatibility.

When retrieving a savedObject document from an index, if the version of the document is higher than the latest version
known of the Kibana instance, the document will go through the `forwardCompatibility` schema of the associated model version.

These conversion mechanism shouldn't assert the data itself, and only strip unknown fields to convert the document to 
the **shape** of the document at the given version.

### create

This is a direct replacement for [the old SavedObjectType.schemas](https://github.com/elastic/kibana/blob/9b330e493216e8dde3166451e4714966f63f5ab7/packages/core/saved-objects/core-saved-objects-server/src/saved_objects_type.ts#L75-L82)
definition, which is now directly included in the version definition.

As a refresher the `create` schema is a `@kbn/config-schema` Object schema, and is used to validate the properties of the document
during `create` and `bulkCreate` operations.

#### example of version definition

A model version registration looks like this:

```ts
const myType: SavedObjectsType = {
  name: 'test',
  switchToModelVersionAt: '8.10.0',
  modelVersions: {
    1: {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            someNewField: { type: 'text' },
          },
        },
        {
          type: 'data_backfill',
          transform: someBackfillFunction,
        },
      ],
      schemas: {
        forwardCompatibility: fcSchema,
        create: createSchema,
      },
    },
  },
  // ...other mandatory properties
};
```

## Use-case examples

### Adding a non-indexed field without default value

We are currently in model version 1, and our type has 2 indexed fields defined: `foo` and `bar`.
the definition of the type at version 1 looks like:

```ts
const myType: SavedObjectsType = {
  name: 'test',
  namespaceType: 'single',
  switchToModelVersionAt: '8.10.0',
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: schema.object(
          { foo: schema.string(), bar: schema.string() },
          { unknowns: 'ignore' }
        ),
      },
    },
  },
  mappings: {
    properties: {
      foo: { type: 'text' },
      bar: { type: 'text' },
    },
  },
};
```

then, we want to introduce a new `dolly` field that is not indexed, and that we don't need to populate with a default value.

In that case, all we need to do is to introduce a new model version, and the only thing to do will be to update the 
`forwardCompatibility` schema to include the new field.

The added model version would look like:

```ts
// the new model version adding the `dolly` field
let modelVersion2: SavedObjectsModelVersion = {
  // no mapping addition, no data backfill, so changes are actually empty
  changes: [],
  schemas: {
    // the only addition in this model version: taking the new field into account
    // for the forwardCompatibility schema
    forwardCompatibility: schema.object(
      { foo: schema.string(), bar: schema.string(), dolly: schema.string() },
      { unknowns: 'ignore' }
    ),
  },
};
```

The full type definition after the addition of the new model version: 

```ts
const myType: SavedObjectsType = {
  name: 'test',
  namespaceType: 'single',
  switchToModelVersionAt: '8.10.0',
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: schema.object(
          { foo: schema.string(), bar: schema.string() },
          { unknowns: 'ignore' }
        ),
      },
    },
    2: {
      changes: [],
      schemas: {
        forwardCompatibility: schema.object(
          { foo: schema.string(), bar: schema.string(), dolly: schema.string() },
          { unknowns: 'ignore' }
        ),
      },
    },
  },
  mappings: {
    properties: {
      foo: { type: 'text' },
      bar: { type: 'text' },
    },
  },
};
```

### Adding a indexed field without default value

This scenario is fairly close to the previous one. The difference being that working with an indexed field means
adding a `mappings_addition` change and to also update the root mappings accordingly.  

To reuse the previous example, let's say the `dolly` field we want to add would need to be indexed instead.

In that case, the new version needs to do the following:
- add a `mappings_addition` type change to define the new mappings
- updates the root `mappings` accordingly
- add an updated `forwardCompatibility` as we did for the previous example

The new version definition would look like: 

```ts
let modelVersion2: SavedObjectsModelVersion = {
  // no mapping addition, no data backfill, so changes are actually empty
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        dolly: { type: 'text' },
      },
    },
  ],
  schemas: {
    // the only addition in this model version: taking the new field into account
    // for the forwardCompatibility schema
    forwardCompatibility: schema.object(
      { foo: schema.string(), bar: schema.string(), dolly: schema.string() },
      { unknowns: 'ignore' }
    ),
  },
};
```

As said, we will also need to update the root mappings definition:

```ts
mappings: {
  properties: {
    foo: { type: 'text' },
    bar: { type: 'text' },
  },
},
```

the full type definition after the addition of the model version 2 would be:

```ts
const myType: SavedObjectsType = {
  name: 'test',
  namespaceType: 'single',
  switchToModelVersionAt: '8.10.0',
  modelVersions: {
    1: {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            foo: { type: 'text' },
            bar: { type: 'text' },
          },
        },
      ],
      schemas: {
        forwardCompatibility: schema.object(
          { foo: schema.string(), bar: schema.string() },
          { unknowns: 'ignore' }
        ),
      },
    },
    2: {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            dolly: { type: 'text' },
          },
        },
      ],
      schemas: {
        forwardCompatibility: schema.object(
          { foo: schema.string(), bar: schema.string(), dolly: schema.string() },
          { unknowns: 'ignore' }
        ),
      },
    },
  },
  mappings: {
    properties: {
      foo: { type: 'text' },
      bar: { type: 'text' },
      dolly: { type: 'text' },
    },
  },
};
```

### Adding an indexed field with a default value

Slightly different scenario where we'd like to populate the newly introduced field with a default value.

Note: `data_backfill` should **only** be used to populate newly introduced fields

Note: if the field was non-indexed, we would just not use the `mappings_addition` change or update the mappings (as done in example 1)

```ts
let modelVersion2: SavedObjectsModelVersion = {
  changes: [
    // setting the `dolly` field default value.
    {
      type: 'data_backfill',
      transform: (document) => {
        document.attributes.dolly = 'default_value';
        return { document };
      },
    },
    // define the mappings for the new field
    {
      type: 'mappings_addition',
      addedMappings: {
        dolly: { type: 'text' },
      },
    },
  ],
  schemas: {
    // define `dolly` as an know field in the schema
    forwardCompatibility: schema.object(
      { foo: schema.string(), bar: schema.string(), dolly: schema.string() },
      { unknowns: 'ignore' }
    ),
  },
};
```


```ts
const myType: SavedObjectsType = {
  name: 'test',
  namespaceType: 'single',
  switchToModelVersionAt: '8.10.0',
  modelVersions: {
    1: {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            foo: { type: 'text' },
            bar: { type: 'text' },
          },
        },
      ],
      schemas: {
        forwardCompatibility: schema.object(
          { foo: schema.string(), bar: schema.string() },
          { unknowns: 'ignore' }
        ),
      },
    },
    2: {
      // no mapping addition, no data backfill, so changes are actually empty
      changes: [
        {
          type: 'data_backfill',
          transform: (document) => {
            document.attributes.dolly = 'default_value';
            return { document };
          },
        },
        {
          type: 'mappings_addition',
          addedMappings: {
            dolly: { type: 'text' },
          },
        },
      ],
      schemas: {
        // define `dolly` as an know field in the schema
        forwardCompatibility: schema.object(
          { foo: schema.string(), bar: schema.string(), dolly: schema.string() },
          { unknowns: 'ignore' }
        ),
      },
    },
  },
  mappings: {
    properties: {
      foo: { type: 'text' },
      bar: { type: 'text' },
      dolly: { type: 'text' },
    },
  },
};
```