/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { ElasticsearchErrorDetails } from './src/types';
export {
  isUnauthorizedError,
  isResponseError,
  isRequestAbortedError,
  isMaximumResponseSizeExceededError,
} from './src/errors';
export type { UnauthorizedError } from './src/errors';
