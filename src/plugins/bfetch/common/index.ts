/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { normalizeError, removeLeadingSlash, appendQueryParam } from './util';
export type { StreamingResponseHandler } from './streaming';
export { type BatchedFunctionParams, createBatchedFunction } from './buffer';
export type { ErrorLike, BatchRequestData, BatchResponseItem, BatchItemWrapper } from './batch';
export {
  DISABLE_BFETCH_COMPRESSION,
  DISABLE_BFETCH,
  BFETCH_ROUTE_VERSION_LATEST,
} from './constants';
