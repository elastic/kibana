/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import { FieldFormatsSetup, FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type {
  ContentManagementPublicSetup,
  ContentManagementPublicStart,
} from '@kbn/content-management-plugin/public';
import { DataViewsServicePublicMethods } from './data_views';
import { HasDataService } from '../common';

export enum INDEX_PATTERN_TYPE {
  ROLLUP = 'rollup',
  DEFAULT = 'default',
}

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

export interface IndicesViaSearchResponse {
  total: number;
}

export interface HasDataViewsResponse {
  hasDataView: boolean;
  hasUserDataView: boolean;
}

/**
 * Data views public setup dependencies
 */
export interface DataViewsPublicSetupDependencies {
  /**
   * Expressions
   */
  expressions: ExpressionsSetup;
  /**
   * Field formats
   */
  fieldFormats: FieldFormatsSetup;
  /**
   * Content management
   */
  contentManagement: ContentManagementPublicSetup;
}

/**
 * Data views public start dependencies
 */
export interface DataViewsPublicStartDependencies {
  /**
   * Field formats
   */
  fieldFormats: FieldFormatsStart;
  /**
   * Content management
   */
  contentManagement: ContentManagementPublicStart;
}

export type UserIdGetter = () => Promise<string | undefined>;

/**
 * Data plugin public Setup contract
 */
export interface DataViewsPublicPluginSetup {
  enableRollups: () => void;
}

export interface DataViewsServicePublic extends DataViewsServicePublicMethods {
  getCanSaveSync: () => boolean;
  hasData: HasDataService;
  getIndices: (props: {
    pattern: string;
    showAllIndices?: boolean;
    isRollupIndex: (indexName: string) => boolean;
  }) => Promise<MatchedItem[]>;
  getRollupsEnabled: () => boolean;
  scriptedFieldsEnabled: boolean;
  /**
   * Get existing index pattern list by providing string array index pattern list.
   * @param indices - index pattern list
   * @returns index pattern list of index patterns that match indices
   */
  getExistingIndices: (indices: string[]) => Promise<string[]>;
}

export type DataViewsContract = DataViewsServicePublic;

/**
 * Data views plugin public Start contract
 */
export type DataViewsPublicPluginStart = DataViewsServicePublic;

export interface MatchedItem {
  name: string;
  tags: Tag[];
  item: {
    name: string;
    backing_indices?: string[];
    timestamp_field?: string;
    indices?: string[];
    aliases?: string[];
    attributes?: ResolveIndexResponseItemIndexAttrs[];
    data_stream?: string;
  };
}

// for showing index matches
export interface ResolveIndexResponse {
  indices?: ResolveIndexResponseItemIndex[];
  aliases?: ResolveIndexResponseItemAlias[];
  data_streams?: ResolveIndexResponseItemDataStream[];
}

export interface ResolveIndexResponseItem {
  name: string;
}

export interface ResolveIndexResponseItemDataStream extends ResolveIndexResponseItem {
  backing_indices: string[];
  timestamp_field: string;
}

export interface ResolveIndexResponseItemAlias extends ResolveIndexResponseItem {
  indices: string[];
}

export interface ResolveIndexResponseItemIndex extends ResolveIndexResponseItem {
  aliases?: string[];
  attributes?: ResolveIndexResponseItemIndexAttrs[];
  data_stream?: string;
}

export interface Tag {
  name: string;
  key: string;
  color: string;
}
export enum ResolveIndexResponseItemIndexAttrs {
  OPEN = 'open',
  CLOSED = 'closed',
  HIDDEN = 'hidden',
  FROZEN = 'frozen',
}
