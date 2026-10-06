/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { errors as esErrors } from '@elastic/elasticsearch';
type EsErrors =
  | esErrors.ConnectionError
  | esErrors.NoLivingConnectionsError
  | esErrors.TimeoutError
  | esErrors.ResponseError;
export declare function decorateEsError(
  error: EsErrors
): import('@kbn/core-saved-objects-server').DecoratedError;
export {};
