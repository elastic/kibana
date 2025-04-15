# Collector Schema Guideline

Table of contents:
- [Collector Schema Guideline](#collector-schema-guideline)
  - [Adding schema to your collector](#adding-schema-to-your-collector)
    - [1. Update the telemetryrc file](#1-update-the-telemetryrc-file)
    - [2. Type the `fetch` function](#2-type-the-fetch-function)
    - [3. Add a `schema` field](#3-add-a-schema-field)
    - [4. Run the telemetry check](#4-run-the-telemetry-check)
    - [5. Update the stored json files](#5-update-the-stored-json-files)
  - [Updating the collector schema](#updating-the-collector-schema)
  - [Writing the schema](#writing-the-schema)
    - [Basics](#basics)
    - [Allowed types](#allowed-types)
    - [Dealing with arrays](#dealing-with-arrays)
  - [Schema Restrictions](#schema-restrictions)
    - [Root of schema can only be an object](#root-of-schema-can-only-be-an-object)


## Adding schema to your collector

To add a `schema` to the collector, follow these steps until the telemetry check passes.
To check the next step needed simply run the telemetry check with the path of your collector:

```
node scripts/telemetry_check.js --path=<relative_path_to_collector>.ts
```

### 1. Update the telemetryrc file

Make sure your collector is not excluded in the `telemetryrc.json` files (located at the root of the kibana project, and another on in the `x-pack` dir).

```s
[
  {
    ...
    "exclude": [
      "<path_to_my_collector>"
    ]
  }
]
```

Note that the check will fail if the collector in --path is excluded.

### 2. Type the `fetch` function
1. Make sure the return of the `fetch` function is typed.

The function `makeUsageCollector` accepts a generic type parameter of the returned type of the `fetch` function. 

```
interface Usage {
  someStat: number;
}

usageCollection.makeUsageCollector<Usage>({
  fetch: async () => {
    return {
      someStat: 3,
    }
  },
  ...
})
```

The generic type passed to `makeUsageCollector` will automatically unwrap the `Promise` to check for the resolved type.

### 3. Add a `schema` field

Add a `schema` field to your collector. After passing the return type of the fetch function to the `makeUsageCollector` generic parameter. It will automaticallly figure out the correct type of the schema based on that provided type.


```
interface Usage {
  someStat: number;
}

usageCollection.makeUsageCollector<Usage>({
  schema: {
    someStat: {
      type: 'long'
    }
  },
  ...
})
```

For full details on writing the `schema` object, check the [Writing the schema](#writing-the-schema) section.

### 4. Run the telemetry check

To make sure your changes pass the telemetry check you can run the following:

```
node scripts/telemetry_check.js --ignore-stored-json --path=<relative_path_to_collector>.ts
```

### 5. Update the stored json files

The `--fix` flag will automatically update the persisted json files used by the telemetry team.

```
node scripts/telemetry_check.js --fix
```

Note that any updates to the stored json files will require a review by the kibana-core team to help us update the telemetry cluster mappings and ensure your changes adhere to our best practices.


## Updating the collector schema

Simply update the fetch function to start returning the updated fields back to our cluster. The update the schema to accomodate these changes.

Once youre run the changes to both the `fetch` function and the `schema` field run the following command

```
node scripts/telemetry_check.js --fix
```

The `--fix` flag will automatically update the persisted json files used by the telemetry team. Note that any updates to the stored json files will require a review by the kibana-core team to help us update the telemetry cluster mappings and ensure your changes adhere to our best practices.


## Writing the schema

We've designed the schema object to closely resemble elasticsearch mapping object to reduce any cognitive complexity.

### Basics

The function `makeUsageCollector` will automatically translate the returned `Usage` fetch type to the `schema` object. This way you'll have the typescript type checker helping you write the correct corrisponding schema.

```
interface Usage {
  someStat: number;
}

usageCollection.makeUsageCollector<Usage>({
  schema: {
    someStat: {
      type: 'long'
    }
  },
  ...
})
```


### Allowed types

Any field property in the schema accepts a `type` field. By default the type is `object` which accepts nested properties under it. Currently we accept the following property types:

```
'long', 'integer', 'short', 'byte', 'double', 'float', 'keyword', 'text', 'boolean', 'date'
```


### Dealing with arrays

You can optionally define a property to be an array by setting the `isArray` to `true`. Note that the `isArray` property is not currently required.


```
interface Usage {
  arrayOfStrings: string[];
  arrayOfObjects: {key: string; value: number; }[];
}

usageCollection.makeUsageCollector<Usage>({
  fetch: () => {
    return {
      arrayOfStrings: ['item_one', 'item_two'],
      arrayOfObjects: [
        { key: 'key_one', value: 13 },
      ]
    }
  }
  schema: {
    arrayOfStrings: {
      type: 'keyword',
      isArray: true,
    },
    arrayOfObjects: {
      isArray: true,
      key: {
        type: 'keyword',
      },
      value: {
        type: 'long',
      },
    }
  },
  ...
})
```

Be careful adding arrays of objects due to the limitation in correlating the properties inside those objects inside kibana. It is advised to look for an alternative schema based on your use cases.


## Schema Restrictions

We have enforced some restrictions to the schema object to adhere to our telemetry best practices. These practices are derived from the usablity of the sent data in our telemetry cluster.


### Root of schema can only be an object

The root of the schema can only be an object. Currently any property must be nested inside the main schema object.