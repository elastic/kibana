/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentClient } from '@kbn/content-management-plugin/public';
import type {
  DataViewAttributes,
  SavedObject,
  PersistenceAPI,
  SavedObjectsClientCommonFindArgs,
} from '../common/types';
import type { DataViewCrudTypes } from '../common/content_management';
export declare class ContentMagementWrapper implements PersistenceAPI {
  private contentManagementClient;
  constructor(contentManagementClient: ContentClient);
  find(
    options: SavedObjectsClientCommonFindArgs
  ): Promise<import('@kbn/content-management-utils').SOWithMetadata<DataViewAttributes>[]>;
  get(
    id: string
  ): Promise<import('@kbn/content-management-utils').SOWithMetadata<DataViewAttributes>>;
  update(
    id: string,
    attributes: DataViewAttributes,
    options: DataViewCrudTypes['UpdateOptions']
  ): Promise<SavedObject<DataViewAttributes>>;
  create(
    attributes: DataViewAttributes,
    options: DataViewCrudTypes['CreateOptions']
  ): Promise<import('@kbn/content-management-utils').SOWithMetadata<DataViewAttributes>>;
  delete(id: string): Promise<void>;
}
