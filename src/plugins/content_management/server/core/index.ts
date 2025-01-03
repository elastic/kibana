/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { Core } from './core';

export type { CoreApi } from './core';

export type { ContentType } from './content_type';

export type {
  ContentStorage,
  ContentTypeDefinition,
  StorageContext,
  StorageContextGetTransformFn,
  MSearchConfig,
} from './types';

export type { ContentRegistry } from './registry';

export type { ContentCrud } from './crud';
