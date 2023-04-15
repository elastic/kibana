/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ContentManagementCrudTypes,
  SearchOptions,
  CreateOptions,
  UpdateOptions,
} from '@kbn/content-management-utils';
import { DataViewAttributes } from '../types';
import { DataViewContentType } from './constants';

export type DataViewCrudTypes = ContentManagementCrudTypes<DataViewContentType, DataViewAttributes>;

export type DataViewItem = DataViewCrudTypes['Item'];
export type DataViewMapItem = DataViewCrudTypes['PartialItem'];
// ----------- GET --------------
export type DataViewGetIn = DataViewCrudTypes['GetIn'];
export type DataViewGetOut = DataViewCrudTypes['GetOut'];
// ----------- CREATE --------------
export type DataViewCreateIn = DataViewCrudTypes['CreateIn'];
export type DataViewCreateOut = DataViewCrudTypes['CreateOut'];
export type DataViewCreateOptions = CreateOptions;
// ----------- UPDATE --------------
export type DataViewUpdateIn = DataViewCrudTypes['UpdateIn'];
export type DataViewUpdateOut = DataViewCrudTypes['UpdateOut'];
export type DataViewUpdateOptions = UpdateOptions;
// ----------- DELETE --------------
export type DataViewDeleteIn = DataViewCrudTypes['DeleteIn'];
export type DataViewDeleteOut = DataViewCrudTypes['DeleteOut'];
// ----------- SEARCH --------------
export type DataViewSearchIn = DataViewCrudTypes['SearchIn'];
export type DataViewSearchOut = DataViewCrudTypes['SearchOut'];
export type DataViewSearchOptions = SearchOptions;
