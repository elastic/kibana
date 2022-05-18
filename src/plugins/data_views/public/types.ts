/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import { FieldFormatsSetup, FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { DataViewsServicePublicMethods } from './data_views';
import { HasDataService } from '../common';

export enum IndicesResponseItemIndexAttrs {
  OPEN = 'open',
  CLOSED = 'closed',
  HIDDEN = 'hidden',
  FROZEN = 'frozen',
}

export interface IndicesResponseModified {
  name: string;
  item: {
    name: string;
    backing_indices?: string[];
    timestamp_field?: string;
    indices?: string[];
    aliases?: string[];
    attributes?: IndicesResponseItemIndexAttrs[];
    data_stream?: string;
  };
}

export interface IndicesResponseItem {
  name: string;
}

export interface IndicesResponseItemAlias extends IndicesResponseItem {
  indices: string[];
}

export interface IndicesResponseItemDataStream extends IndicesResponseItem {
  backing_indices: string[];
  timestamp_field: string;
}

export interface IndicesResponseItemIndex extends IndicesResponseItem {
  aliases?: string[];
  attributes?: IndicesResponseItemIndexAttrs[];
  data_stream?: string;
}

export interface IndicesResponse {
  indices?: IndicesResponseItemIndex[];
  aliases?: IndicesResponseItemAlias[];
  data_streams?: IndicesResponseItemDataStream[];
}

export interface HasDataViewsResponse {
  hasDataView: boolean;
  hasUserDataView: boolean;
}

export interface DataViewsPublicSetupDependencies {
  expressions: ExpressionsSetup;
  fieldFormats: FieldFormatsSetup;
}

export interface DataViewsPublicStartDependencies {
  fieldFormats: FieldFormatsStart;
}

/**
 * Data plugin public Setup contract
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataViewsPublicPluginSetup {}

export interface DataViewsServicePublic extends DataViewsServicePublicMethods {
  getCanSaveSync: () => boolean;
  hasData: HasDataService;
}

export type DataViewsContract = DataViewsServicePublic;

/**
 * Data views plugin public Start contract
 */
export type DataViewsPublicPluginStart = DataViewsServicePublic;
