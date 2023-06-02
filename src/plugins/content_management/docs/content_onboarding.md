# Content management - onboarding

This documentation lays down the steps to migrate away from the saved object public client by using the content management registries (public and server) and its public client.

## High level architecture

- New content is registered both in the browser and the server CM registries.
- When registering on the server, a storage instance is required. This storage instance exposes CRUD and search functionalities for the content (by calling the saved object client apis).
- In the browser, the `contentManagement` plugin exposes a client to call the storage instance methods on the server.

With the above step:

- All Requests are cached in the browser
- Events are emitted on the server (`'getItemStart'`, `'getItemSuccess'`...)
- Content version is added to all HTTP request (to allow BWC implementation on the server)

## Steps

### 1. Add Kibana plugin dependency to the contentManagement plugin

```
// kibana.jsonc
{
  ...
  "requiredPlugins": [
    ...
    "contentManagement"
  ]
}
```

### 2. Create the TS types + validation schema for the content

To version the different objects that are sent to/returned by the storage instance methods we will create one folder for each new version of our content. This will help keep things tidy as our content evolves.
This is the folder structure that we are going to use:

```js
- src/plugins/<my_plugin>/common/content_management
  - index.ts
  - latest.ts // export the types of the latest version
  - types.ts // common types
  - cm_services.ts // Map of Content management service definitions for each version
  - v1 // folder for the version 1 of our content
    - index.ts
    - types.ts // types for "v1"
    - cm_services.ts // Content management service definition for "v1"
```

#### 2.a. Types

We create a "v1" folder and start exporting the different object types.

```ts
// common/content_management/v1/types.ts
import type {
  // Use the In/Out types from contentManagement to build yours
  GetIn,
  GetResult,
  CreateIn,
  CreateResult,
  ...
} from '@kbn/content-management-plugin/common';

export type MapContentType = 'map';

export type MapAttributes = {
  title: string;
  description?: string;
  ...
};

// Create a unique interface for your content
export interface MapItem<T = MapAttributes> {
  id: string;
  type: string;
  version?: string;
  // ... all other SO fields needed
  attributes: T;
}

// Expose the IN/OUT interface of all the objects used in your CRUD + Search
// Having clearly defined interfaces for what is sent (IN) and what is returned (OUT) will greatly help
// with BWC and building transforms function for our objects.

export MapGetIn = GetIn<MapContentType>;
export MapGetOut = GetResult<MapItem, { someOptionalMetaField: string }>;

// All methods allow a last "Options" object to be passed
export interface CreateOptions { references?: Reference[]; }
export type MapCreateIn = CreateIn<MapContentType, MapAttributes, CreateOptions>;
export type MapCreateOut = CreateResult<MapSavedObject>;

// ... follow the same pattern for all the CRUD + search methods
```

Once all the types have been defined we export them from the `latest.ts` file.

```ts
// common/content_management/latest.ts
export * from './v1';
```

And from the barrel file we explicitly export the types from `latest.ts`

```ts
// common/content_management/index.ts
export type {
  MapAttributes,
  MapItem,
  MapGetIn,
  MapGetOut,
  ...
} from './latest';
```

#### 2.b. Content management services definition

Now that we have the TS interfaces defined, let's create a content management services definition. This is where you will declare runtime validation schemas and `up()` and `down()` transform functions to convert your objects to previous/next version of your content. We won't add those just yet because we only have one version, but at the end of this doc we will see how to declare a new version of our content.

```ts
// common/content_management/v1/cm_services.ts
import { schema } from '@kbn/config-schema';
import type { ContentManagementServicesDefinition as ServicesDefinition } from '@kbn/object-versioning';

// We export the attributes object so we can extend it in future version
export const mapAttributesProperties = {
  title: schema.string(),
  description: schema.maybe(schema.string()),
  ...
};

const mapAttributesSchema = schema.object(
  mapAttributesProperties,
  { unknowns: 'forbid' }
);

// We export the mapItem object so we can extend it in future version
export const mapItemProperties = {
  id: schema.string(),
  type: schema.string(),
  ...
  attributes: mapAttributesSchema,
};

const mapItemSchema = schema.object(
  mapItemProperties,
  { unknowns: 'allow' }
);

// The storage instance "get()" response. It corresponds to our MapGetOut interface above.
const getResultSchema = schema.object(
  {
    item: mapItemSchema,
    meta: schema.object(
      {
        someOptionalMetaField: schema.maybe(schema.string()), // See "MapGetOut" above for this meta field
      },
      { unknowns: 'forbid' }
    ),
  },
  { unknowns: 'forbid' }
);

// Schema for the "CreateOptions" TS interface
const createOptionsSchema = schema.object({
  references: schema.maybe(referencesSchema),
});

// ... follow the same pattern for all your objects

// Create a CM services definition
export const serviceDefinition: ServicesDefinition = {
  get: {
    out: {
      result: {
        schema: getResultSchema,
      },
    },
  },
  create: {
    in: {
      options: {
        schema: createOptionsSchema,
      },
      data: {
        // Schema to validate the data to be saved
        schema: mapAttributesSchema,
      },
    },
    out: {
      result: {
        schema: schema.object(
          {
            item: mapSavedObjectSchema,
          },
          { unknowns: 'forbid' }
        ),
      },
    },
  },
  // ...other methods
};
```

#### 2.c. Declare a map of CM services definition

We expose a map of all the versioned supported. Initially we'll have a single version but as our content evolves we will be adding more versions in this map.

```ts
// common/content_management/cm_services.ts
import type {
  ContentManagementServicesDefinition as ServicesDefinition,
  Version,
} from '@kbn/object-versioning';

// We export the versionned service definition from this file and not the barrel to avoid adding
// the schemas in the "public" js bundle

import { serviceDefinition as v1 } from './v1/cm_services';

export const cmServicesDefinition: { [version: Version]: ServicesDefinition } = {
  1: v1,
};
```

### 3. Create a Storage instance for the content

Once we have all our TS types defined and our CM ServicesDefinition map, we can create a `ContentStorage` class and its CRUD + search methods.

```ts
/**
 * Import the map of CM services definitions that we created earlier.
 */
import { cmServicesDefinition } from '../../common/content_management/cm_services';

/**
 * It is a good practice to not directly exposes the SO document fields, specially the "attributes" object.
 * Having a serializer function to convert the SavedObject<T> to our own specific content (MapItem) guarantees
 * that we won't leak any additional fields in our Response, even when the SO client adds new fields to its responses.
 */
function savedObjectToMapItem(
  savedObject: SavedObject<MapAttributes>
): MapItem {
  const {
    id,
    type,
    updated_at: updatedAt,
    created_at: createdAt,
    attributes: { title, description, ... },
    references,
    error,
    namespaces,
  } = savedObject;

  return {
    id,
    type,
    updatedAt,
    createdAt,
    attributes: {
      title,
      description,
      // other attributes. Ideally **not** stringified JSON
      // but proper objects that can be versionned and transformed
      ...
    },
    references,
    error,
    namespaces,
  };
}

export class MapsStorage implements ContentStorage<MapSavedObject, PartialMapSavedObject> {
  // Every method receives a context object with content version information, the core request handler context
  // (which contains the scoped SO client), utilities...
  async get(ctx: StorageContext, id: string): Promise<MapGetOut> {
    const {
      requestHandlerContext,
      utils: { getTransforms },
      version: { request: requestVersion },
    } = ctx;
    const { savedObjects: { client: soClient } } = await requestHandlerContext.core;

    // Get the up/down transform for the CM services passing the requestVersion.
    // All the "up()" calls will transform from the requestVersion to the "latest" declared in the registry
    // All the "down()" calls will transform from the "latest" to the requestVersion.
    // Important: calling "down()" or "up()" will **never** throw if no handler is declared. The object will simply be returned.
    const transforms = getTransforms(cmServicesDefinition, requestVersion);

    // Call the SO client
    const {
      saved_object: savedObject,
      alias_purpose: aliasPurpose,
      alias_target_id: aliasTargetId,
      outcome,
    } = await soClient.resolve<MapAttributes>(SO_TYPE, id);

    const response: MapGetOut = {
      item: savedObjectToMapItem(savedObject),
      meta: {
        aliasPurpose,
        aliasTargetId,
        outcome,
      },
    };

    // Validate DB response and DOWN transform to the request version
    // Note: If the request version === latest version the object will be returned as is.
    const { value, error: resultValidationError } = transforms.get.out.result.down<
      MapGetOut,
      MapGetOut
    >(response);

    if (resultValidationError) {
      throw Boom.badRequest(`Invalid response. ${resultValidationError.message}`);
    }

    return value;
  }

  async create(
    ctx: StorageContext,
    data: MapCreateIn['data'],
    options: CreateOptions
  ): Promise<MapCreateOut> {
    ... // same logic to initiate transforms, get the SO client....

    // Validate input (data & options) & UP transform them to the latest version
    const { value: dataToLatest, error: dataError } = transforms.create.in.data.up<
      MapAttributes,
      MapAttributes
    >(data);
    if (dataError) {
      throw Boom.badRequest(`Invalid payload. ${dataError.message}`);
    }

    const { value: optionsToLatest, error: optionsError } =
      transforms.create.in.options.up<CreateOptions, CreateOptions>(options);
    if (optionsError) {
      throw Boom.badRequest(`Invalid payload. ${optionsError.message}`);
    }

    // At this stage:
    //   - the "data" and "options" object are valid
    //   - both are on the latest version

    // Save data in DB
    const savedObject = await soClient.create<MapAttributes>(
      SO_TYPE,
      dataToLatest,
      optionsToLatest
    );

    // Validate DB response and DOWN transform to the request version
    const { value, error: resultError } = transforms.create.out.result.down<
      MapCreateOut,
      MapCreateOut
    >({
      item: savedObjectToMapItem(savedObject),
    });

    if (resultError) {
      throw Boom.badRequest(`Invalid payload. ${resultError.message}`);
    }

    // value is valid for the client (browser)
    return value;
  }

  // ...same pattern for bulkGet(), update(), delete(), search
}
```

### 4. Register the content on the server

Once the storage instance is ready we can register the content server side.

Let's first create some constants...

```ts
// common/content_management/constants.ts

/**
 * The latest version of our content. We'll increase it by 1 for each new version.
 */
export const LATEST_VERSION = 1;

/**
 * The contentType id. It does not have to be the same as the SO name but
 * it's probably a good idea if they match.
 */
export const CONTENT_ID = 'map';
```

```ts
// server/plugin.ts

export class MapsPlugin implements Plugin {
  ...

  setup(core: CoreSetup, plugins: SetupDeps) {
    ...

    const { <otherDeps>, contentManagement } = plugins;
    ...

    contentManagement.register({
      id: CONTENT_ID,
      storage: new MapsStorage(), // Instantiate our storage class
      version: {
        latest: LATEST_VERSION,
      },
    });

    ...
  }

  ...
}
```

### 5. Register the content in the browser

```ts
// public/plugin.ts

import { CONTENT_ID, LATEST_VERSION } from '../common/content_management';

export class MapsPlugin implements Plugin
{
  ...

  public setup(
    core: CoreSetup<MapsPluginStartDependencies, MapsPluginStart>,
    plugins: MapsPluginSetupDependencies
  ): MapsSetupApi {
    ...

    plugins.contentManagement.registry.register({
      id: CONTENT_ID,
      version: {
        latest: LATEST_VERSION,
      },
      name: getAppTitle(),
    });

    ...
  }

  ...
}
```

### 6. Expose a public client

This step is optional but it is recommended. Indeed, we could access the CM public client and call its api directly in our React app but that means that we would have to also pass everywhere the generics to type our payloads and responses. To avoid that we will build a maps client where each method is correctly typed.

```ts
// public/content_management/maps_client.ts

import type { SearchQuery } from '@kbn/content-management-plugin/common';

import type { MapGetIn, MapGetOut, MapCreateIn, MapCreateOut, ... } from '../../common/content_management';
import { getContentManagement } from '../kibana_services';

const get = async (id: string) => {
  return getContentManagement().client.get<MapGetIn, MapGetOut>({
    contentTypeId: 'map',
    id,
  });
};

const create = async ({ data, options }: Omit<MapCreateIn, 'contentTypeId'>) => {
  const res = await getContentManagement().client.create<MapCreateIn, MapCreateOut>({
    contentTypeId: 'map',
    data,
    options,
  });
  return res;
};

// ... same pattern for other methods

export const mapsClient = {
  get,
  create,
  ...
};
```

We now have a client that we can use anywhere in our app that will call our storage instance on the server, automatically passing the browser version (requestVersion) for BWC support.

```ts
import { mapsClient } from './content_management';

const { id } = await (savedObjectId
  ? mapsClient.update({ id: savedObjectId, data: updatedAttributes, options: { references } })
  : mapsClient.create({ data: updatedAttributes, options: { references } }));
```

## BWC compatibility and Zero downtime

With serverless we need to support the case where the server is on a more recent version than the browser. On a newer version of our content a field might have been removed or renamed, the DB mapping updated and the server is now expecting object with a different contract than the previous version. The solution in CM to support this is to declare `up()` and `down()` transforms for our objects.

### Example

Let's imagine that the map `"title"` fields needs to be changed to `"name"`. We make the required changes in the mappings for the SO migrations and the "title" field is removed/renamed in the DB, the server is on "v2" and start accepting request from clients either on "v1" or on "v2". When creating a new map, the "v2" server expects the object to contain a "name" field, (and not "title" anymore).

Create a "v2" folder for the new TS interfaces and CM services definition

#### 1. Update the types

```ts
// common/content_management/v2/types
import { MapItem as MapItemV1, CreateOptions } from '../v1';

export interface MapAttributes {
  name: string; // --> changed "title" with "name"
  description?: string;
  ...
}

// Export a new MapItem for "v2"
export type MapItem = MapItemV1<MapAttributes>;

// Re-export all the types fro "v1" that have not changed
export { MapGetIn } from '../v1';
export type MapGetOut = GetResult<MapItem, { someOptionalMetaField: string }>;

export type MapCreateIn = CreateIn<MapContentType, MapAttributes, CreateOptions>;

// Re-export all other types, either explicitely either re-exporting the "v1" ones.
```

#### 2. Update `latest.ts` to point to the new version

```ts
// common/content_management/latest.ts
export * from './v2';
```

#### 3. Create a new cm services definition

Note: Use `down()` transforms for objects that are returned ("out") to the client

```ts
// common/content_management/v2/cm_services.ts

import {
  serviceDefinition as serviceDefinitionV1,
  mapAttributesProperties as mapAttributesPropertiesV1,
  mapItemProperties as mapItemPropertiesV1,
  type MapGetOut as MapGetOutV1, // the "v1" one
} from '../v1';
import { MapGetOut } from './types'; // the "v2" one

const { title, ...mapAttributesPropertiesNoTitle } = mapAttributesPropertiesV1;
export const mapAttributesProperties = {
  ...mapAttributesPropertiesNoTitle,
  name: schema.string(), // "title" is now "name"
};

const mapAttributesSchema = schema.object(mapAttributesProperties, { unknowns: 'forbid' });

export const mapItemSchema = schema.object(
  {
    ...mapItemPropertiesV1, // nothing has changed except the "attributes" that we'll override below
    attributes: mapAttributesSchema,
  },
  { unknowns: 'allow' }
);

const getResultSchema = schema.object(
  {
    item: mapItemSchema,
    meta: schema.object(
      {
        someOptionalMetaField: schema.maybe(schema.string()),
      },
      { unknowns: 'forbid' }
    ),
  },
  { unknowns: 'forbid' }
);

// Create a CM services definition
export const serviceDefinition: ServicesDefinition = {
  // 1. Merge previous definition
  ...serviceDefinitionV1,
  // 2. Override any service objects
  get: {
    out: {
      result: {
        schema: getResultSchema,
        down: (result: MapGetOut): MapGetOutV1 => {
          // Down transform the result to "v1" version
          const { name, ...rest } = result.item;
          return {
            ...result,
            item: {
              ...rest,
              title: name,
            },
          };
        },
      },
    },
  },
  create: {
    in: {
      ...serviceDefinitionV1.create.in,
      data: {
        schema: mapAttributesSchema,
      },
    },
    out: {
      result: {
        schema: schema.object(
          {
            item: mapSavedObjectSchema,
          },
          { unknowns: 'forbid' }
        ),
      },
    },
  },
  // ...other methods
};
```

#### 4. Add the new CM services definition to the map

```ts
// common/content_management/cm_services.ts
...

import { serviceDefinition as v1 } from './v1/cm_services';
import { serviceDefinition as v2 } from './v2/cm_services';

export const cmServicesDefinition: { [version: Version]: ServicesDefinition } = {
  1: v1,
  2: v2,
};
```

#### 5. Update the "v1" services definition and add `up()` transforms

Note: Use `up()` transforms for objects coming "in" (input parameters of the storage instance methods)

```ts
// common/content_management/v1/cm_services.ts
import { type MapCreateIn as MapCreateInV2 } from '../v2'; // the "v2" one
import { MapCreateIn } from './types'; // the "v1" one

export const serviceDefinition: ServicesDefinition = {
  ...
  create: {
    in: {
      ...
      data: {
        schema: mapAttributesSchema,
        // We add this "up()" transform to make "v1" data work with the "v2" server
        up: (data: MapCreateIn['data']): MapCreateInV2['data'] => {
          const { title, ...rest } = data;
          return {
            ...rest,
            name: title, // Change "title" to "name"
          }
        }
      },
    },
    ...
  },
  ...
};
```

That is all that is required for BWC. As we have seen, once we have added inside our storage instance methods the logic to up/down transforms all the objects we don't need to change its logic when releasing a new version of the content. Everything is handled inside the services definitions.

## Multi content type search - `MSearch`

Implementing search functionality in your `ContentStorage` class covers a use-case of a single content type search.
But we also need to search across multiple content types. This is a common use-case in Kibana, for example, Visualize listing page searches across multiple types of objects.
Until we have a dedicated search layer in CM services, we provide a separate temporary `MSearch` api to replace client-side and naive server proxy usages of `savedObjects.find()` that search across multiple types.

### `MSearch` Summary

- `MSearch` is a temporary API in the content management to do a cross-type search
  - _Later we hope to unify this API and regular single type `search` api if/when we have a search layer inside content management_
- Content management code internally is calling `savedObjects.find`. Only saved objects backed content types can be searched through this endpoint.
- The search input is a minimal API that allows us to support use-cases like `SavedObjectFinder` or `TableListView`. It is a small subset of the `savedObjects.find` API input.
- The search output is a list of results from `savedObjects.find` that are transformed by mappers provided by plugins to the same format that is returned from `get` and `search` endpoints of content type’s `ContentStorage`. Plugins should take care of transforming the objects to the correct version. They can use content management’s bwc transformation utils for this and apply the same approach as for other cm methods.
- In addition to the output mapper, plugins also can specify `additionalSearchFields` to search across in addition to the default ones (`title`, `description`).

### `MSearch` API example

To opt in your saved object backed content type to be searchable through `MSearch` you need to add the following to your `ContentStorage` class:

```ts
export class MapsStorage implements ContentStorage<MapSavedObject, PartialMapSavedObject> {
    // ...

  mSearch: {
    savedObjectType: 'maps',
    additionalSearchFields: ['mapStateJSON'],
    toItemResult: (ctx: StorageContext, result: MapSavedObject) => {
       const mapItem = savedObjectToMapItem(result);
       // Also use content management's bwc transformation utils to tranform the `mapItem` down to the correct version
       return mapItem;
    }
  }
}
```
