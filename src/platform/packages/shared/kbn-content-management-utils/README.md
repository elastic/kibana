# Content management utils

Utilities to ease the implementation of the Content Management API with Saved Objects.

```ts
import type {
  ContentManagementCrudTypes,
  CreateOptions,
  SearchOptions,
  UpdateOptions,
} from '@kbn/content-management-utils';
import { MapContentType } from '../types';

export type MapCrudTypes = ContentManagementCrudTypes<MapContentType, MapAttributes>;

/* eslint-disable-next-line @typescript-eslint/consistent-type-definitions */
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
export type MapCreateOptions = CreateOptions;

// ----------- UPDATE --------------

export type MapUpdateIn = MapCrudTypes['UpdateIn'];
export type MapUpdateOut = MapCrudTypes['UpdateOut'];
export type MapUpdateOptions = UpdateOptions;

// ----------- DELETE --------------

export type MapDeleteIn = MapCrudTypes['DeleteIn'];
export type MapDeleteOut = MapCrudTypes['DeleteOut'];

// ----------- SEARCH --------------

export type MapSearchIn = MapCrudTypes['SearchIn'];
export type MapSearchOut = MapCrudTypes['SearchOut'];
export type MapSearchOptions = SearchOptions;

```


