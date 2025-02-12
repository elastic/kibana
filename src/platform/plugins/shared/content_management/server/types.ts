/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Version } from '@kbn/object-versioning';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { FavoritesSetup } from '@kbn/content-management-favorites-server';
import type { CoreApi, StorageContextGetTransformFn } from './core';

export interface ContentManagementServerSetupDependencies {
  usageCollection?: UsageCollectionSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContentManagementServerStartDependencies {}

export interface ContentManagementServerSetup extends CoreApi {
  favorites: FavoritesSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContentManagementServerStart {}

export type GetTransformsFactoryFn = (
  contentTypeId: string,
  requestVersion: Version,
  options?: { cacheEnabled?: boolean }
) => StorageContextGetTransformFn;
