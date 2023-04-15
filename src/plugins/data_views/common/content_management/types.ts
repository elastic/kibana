/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ContentManagementCrudTypes, SearchOptions } from '@kbn/content-management-utils';
import { DataViewAttributes } from '../types';
import { DataViewContentType } from './constants';

export type DataViewCrudTypes = ContentManagementCrudTypes<DataViewContentType, DataViewAttributes>;

export type MapItem = DataViewCrudTypes['Item'];
export type PartialMapItem = DataViewCrudTypes['PartialItem'];
// ----------- GET --------------
export type MapGetIn = DataViewCrudTypes['GetIn'];
export type MapGetOut = DataViewCrudTypes['GetOut'];
// ----------- CREATE --------------
export type MapCreateIn = DataViewCrudTypes['CreateIn'];
export type MapCreateOut = DataViewCrudTypes['CreateOut'];
// ----------- UPDATE --------------
export type MapUpdateIn = DataViewCrudTypes['UpdateIn'];
export type MapUpdateOut = DataViewCrudTypes['UpdateOut'];
// ----------- DELETE --------------
export type MapDeleteIn = DataViewCrudTypes['DeleteIn'];
export type MapDeleteOut = DataViewCrudTypes['DeleteOut'];
// ----------- SEARCH --------------
export type MapSearchIn = DataViewCrudTypes['SearchIn'];
export type MapSearchOut = DataViewCrudTypes['SearchOut'];
export type MapSearchOptions = SearchOptions;
