# Content management utils

Utilities to ease the implementation of the Content Management API with Saved Objects.

```ts
import type { ContentManagementCrudTypes } from '@kbn/content-management-utils';

export type MapCrudTypes = ContentManagementCrudTypes<MapContentType, MapAttributes>;

export type MapAttributes = {
  title: string;
  description?: string;
  mapStateJSON?: string;
  layerListJSON?: string;
  uiStateJSON?: string;
};

export type MapItem = MapCrudTypes['Item'];
export type PartialMapItem = MapCrudTypes['PartialItem'];

// ----------- GET --------------

export type MapGetIn = MapCrudTypes['GetIn'];
export type MapGetOut = MapCrudTypes['GetOut'];

// ----------- CREATE --------------

export type MapCreateIn = MapCrudTypes['CreateIn'];
export type MapCreateOut = MapCrudTypes['CreateOut'];

// ----------- UPDATE --------------

export type MapUpdateIn = MapCrudTypes['UpdateIn'];
export type MapUpdateOut = MapCrudTypes['UpdateOut'];

// ----------- DELETE --------------

export type MapDeleteIn = MapCrudTypes['DeleteIn'];
export type MapDeleteOut = MapCrudTypes['DeleteOut'];

// ----------- SEARCH --------------

export type MapSearchIn = MapCrudTypes['SearchIn'];
export type MapSearchOut = MapCrudTypes['SearchOut'];
export type MapSearchOptions = SearchOptions;

```
