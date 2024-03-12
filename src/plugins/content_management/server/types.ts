/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Version } from '@kbn/object-versioning';
import type { CoreApi, StorageContextGetTransformFn } from './core';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContentManagementServerSetupDependencies {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContentManagementServerStartDependencies {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContentManagementServerSetup extends CoreApi {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ContentManagementServerStart {}

export type GetTransformsFactoryFn = (
  contentTypeId: string,
  requestVersion: Version,
  options?: { cacheEnabled?: boolean }
) => StorageContextGetTransformFn;
