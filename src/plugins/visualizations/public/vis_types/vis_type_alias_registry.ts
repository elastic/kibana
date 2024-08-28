/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SearchQuery } from '@kbn/content-management-plugin/common';
import { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type {
  ContentManagementCrudTypes,
  SavedObjectCreateOptions,
  SavedObjectUpdateOptions,
} from '@kbn/content-management-utils';
import type { SimpleSavedObject } from '@kbn/core/public';
import { BaseVisType } from './base_vis_type';

export type VisualizationStage = 'experimental' | 'beta' | 'production';

export interface VisualizationListItem {
  error?: string;
  icon: string;
  id: string;
  stage: VisualizationStage;
  savedObjectType: string;
  title: string;
  description?: string;
  getSupportedTriggers?: () => string[];
  typeTitle: string;
  image?: string;
  type?: BaseVisType | string;
  editor:
    | { editUrl: string; editApp?: string }
    | { onEdit: (savedObjectId: string) => Promise<void> };
}

export interface SerializableAttributes {
  [key: string]: unknown;
}

export type GenericVisualizationCrudTypes<
  ContentType extends string,
  Attr extends SerializableAttributes
> = ContentManagementCrudTypes<
  ContentType,
  Attr,
  Pick<SavedObjectCreateOptions, 'overwrite' | 'references'>,
  Pick<SavedObjectUpdateOptions, 'references'>,
  object
>;

export interface VisualizationClient<
  ContentType extends string = string,
  Attr extends SerializableAttributes = SerializableAttributes
> {
  get: (id: string) => Promise<GenericVisualizationCrudTypes<ContentType, Attr>['GetOut']>;
  create: (
    visualization: Omit<
      GenericVisualizationCrudTypes<ContentType, Attr>['CreateIn'],
      'contentTypeId'
    >
  ) => Promise<GenericVisualizationCrudTypes<ContentType, Attr>['CreateOut']>;
  update: (
    visualization: Omit<
      GenericVisualizationCrudTypes<ContentType, Attr>['UpdateIn'],
      'contentTypeId'
    >
  ) => Promise<GenericVisualizationCrudTypes<ContentType, Attr>['UpdateOut']>;
  delete: (id: string) => Promise<GenericVisualizationCrudTypes<ContentType, Attr>['DeleteOut']>;
  search: (
    query: SearchQuery,
    options?: object
  ) => Promise<GenericVisualizationCrudTypes<ContentType, Attr>['SearchOut']>;
}

export interface VisualizationsAppExtension {
  docTypes: string[];
  searchFields?: string[];
  /** let each visualization client pass its own custom options if required */
  clientOptions?: {
    update?: { overwrite?: boolean; [otherOption: string]: unknown };
    create?: { [otherOption: string]: unknown };
  };
  client: (contentManagement: ContentManagementPublicStart) => VisualizationClient;
  toListItem: (savedObject: SimpleSavedObject<any>) => VisualizationListItem;
}

export interface VisTypeAlias {
  /**
   * Provide `alias` when your visualization has a dedicated app for creation.
   * TODO: Provide a generic callback to create visualizations inline.
   */
  alias?: {
    app: string;
    path: string;
  };
  name: string;
  title: string;
  icon: string;
  promotion?: boolean;
  description: string;
  note?: string;
  getSupportedTriggers?: () => string[];
  stage: VisualizationStage;
  /*
   * Set to true to hide visualization type in create UIs.
   */
  disableCreate?: boolean;
  /*
   * Set to true to hide edit links for visualization type in UIs.
   */
  disableEdit?: boolean;
  isDeprecated?: boolean;

  appExtensions?: {
    visualizations: VisualizationsAppExtension;
    [appName: string]: unknown;
  };
  order?: number;
}

let registry: VisTypeAlias[] = [];
const discardOnRegister: string[] = [];

interface VisTypeAliasRegistry {
  get: () => VisTypeAlias[];
  add: (newVisTypeAlias: VisTypeAlias) => void;
  remove: (visTypeAliasName: string) => void;
}

export const visTypeAliasRegistry: VisTypeAliasRegistry = {
  get: () => [...registry],
  add: (newVisTypeAlias) => {
    if (registry.find((visTypeAlias) => visTypeAlias.name === newVisTypeAlias.name)) {
      throw new Error(`${newVisTypeAlias.name} already registered`);
    }
    // if it exists on discardOnRegister array then we don't allow it to be registered
    const isToBeDiscarded = discardOnRegister.some(
      (aliasName) => aliasName === newVisTypeAlias.name
    );
    if (!isToBeDiscarded) {
      registry.push(newVisTypeAlias);
    }
  },
  remove: (visTypeAliasName) => {
    const isAliasPresent = registry.find((visTypeAlias) => visTypeAlias.name === visTypeAliasName);
    // in case the alias has not registered yet we store it on an array, in order to not allow it to
    // be registered in case of a race condition
    if (!isAliasPresent) {
      discardOnRegister.push(visTypeAliasName);
    } else {
      registry = registry.filter((visTypeAlias) => visTypeAlias.name !== visTypeAliasName);
    }
  },
};
