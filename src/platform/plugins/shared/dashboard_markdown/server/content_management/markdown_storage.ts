/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SearchQuery } from '@kbn/content-management-plugin/common';
import type {
  ContentStorage,
  MSearchConfig,
  StorageContext,
} from '@kbn/content-management-plugin/server';
import type { SavedObjectsFindResult } from '@kbn/core/server';

import { MARKDOWN_SAVED_OBJECT_TYPE } from '../../common/constants';
import { type MarkdownItem, savedObjectToItem } from './transform_utils';
import type { MarkdownAttributes } from '../markdown_saved_object';

export class MarkdownStorage
  implements
    ContentStorage<MarkdownItem, MarkdownItem, MSearchConfig<MarkdownItem, MarkdownAttributes>>
{
  public async get(
    ctx: StorageContext,
    id: string,
    options?: object
  ): Promise<{ item: MarkdownItem; meta?: any }> {
    throw new Error('Get not implemented.');
  }
  public async bulkGet(
    ctx: StorageContext,
    ids: string[],
    options?: object
  ): Promise<{ hits: Array<{ item: MarkdownItem; meta?: any }> }> {
    throw new Error('Bulk get not implemented.');
  }
  public async create(
    ctx: StorageContext,
    data: object,
    options?: object
  ): Promise<{ item: MarkdownItem; meta?: any }> {
    throw new Error('Create not implemented.');
  }
  public async update(
    ctx: StorageContext,
    id: string,
    data: object,
    options?: object
  ): Promise<{ item: MarkdownItem; meta?: any }> {
    throw new Error('Update not implemented.');
  }
  public async delete(
    ctx: StorageContext,
    id: string,
    options?: object
  ): Promise<{ success: boolean }> {
    throw new Error('Delete not implemented.');
  }
  public async search(
    ctx: StorageContext,
    query: SearchQuery,
    options?: object
  ): Promise<{ hits: MarkdownItem[]; pagination: { total: number; cursor?: string } }> {
    throw new Error('Search not implemented.');
  }

  // TODO: Remove in the future at part of content management clean up
  // only required for populating SavedObjectFinder in AddFromLibrary flyout
  mSearch = {
    savedObjectType: MARKDOWN_SAVED_OBJECT_TYPE,
    toItemResult: (ctx: StorageContext, savedObject: SavedObjectsFindResult<MarkdownAttributes>) =>
      savedObjectToItem(savedObject) as MarkdownItem,
  };
}
