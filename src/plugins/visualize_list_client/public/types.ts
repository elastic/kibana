/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MSearchQuery, SearchQuery } from '@kbn/content-management-plugin/common';
import type { SavedObjectAttributes } from '@kbn/core/public';
import {
  ContentManagementCrudTypes,
  SavedObjectCreateOptions,
  SavedObjectUpdateOptions,
} from '@kbn/content-management-utils';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';

export type GenericVisualizationCrudTypes<
  ContentType extends string,
  Attr extends SavedObjectAttributes,
  SearchOptions extends object
> = ContentManagementCrudTypes<
  ContentType,
  Attr,
  Pick<SavedObjectCreateOptions, 'overwrite' | 'references'>,
  Pick<SavedObjectUpdateOptions, 'overwrite' | 'references'>,
  SearchOptions
>;

export interface VisualizationClient<
  ContentType extends string,
  Attr extends SavedObjectAttributes,
  SearchOptions extends object = object
> {
  get: (
    id: string
  ) => Promise<GenericVisualizationCrudTypes<ContentType, Attr, SearchOptions>['GetOut']>;
  create: (
    visualization: Omit<
      GenericVisualizationCrudTypes<ContentType, Attr, SearchOptions>['CreateIn'],
      'contentTypeId'
    >
  ) => Promise<GenericVisualizationCrudTypes<ContentType, Attr, SearchOptions>['CreateOut']>;
  update: (
    visualization: Omit<
      GenericVisualizationCrudTypes<ContentType, Attr, SearchOptions>['UpdateIn'],
      'contentTypeId'
    >
  ) => Promise<GenericVisualizationCrudTypes<ContentType, Attr, SearchOptions>['UpdateOut']>;
  delete: (
    id: string
  ) => Promise<GenericVisualizationCrudTypes<ContentType, Attr, SearchOptions>['DeleteOut']>;
  search: (
    query: SearchQuery,
    options?: SearchOptions
  ) => Promise<GenericVisualizationCrudTypes<ContentType, Attr, SearchOptions>['SearchOut']>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VisualizeListClientPluginSetup {}

export interface MSearchOptions {
  types?: string[];
  searchFields?: string[];
}

export interface VisualizeListClientPluginStart {
  registerType: <
    ContentType extends string,
    Attr extends SavedObjectAttributes,
    SearchOptions extends object = object
  >(
    contentID: string,
    contentCRUD: VisualizationClient<ContentType, Attr, SearchOptions>
  ) => void;
  getClientType: <
    ContentType extends string,
    Attr extends SavedObjectAttributes,
    SearchOptions extends object = object
  >(
    contentID: string
  ) => VisualizationClient<ContentType, Attr, SearchOptions>;
  mSearch: <Attr extends SavedObjectAttributes, SearchOptions extends object = object>(
    query: MSearchQuery,
    options?: MSearchOptions
  ) => Promise<GenericVisualizationCrudTypes<string, Attr, SearchOptions>['SearchOut']>;
}

export interface VisualizeListClientDeps {
  contentManagement: ContentManagementPublicStart;
}
