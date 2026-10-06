/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Request } from '@hapi/hapi';
import type { Logger } from '@kbn/logging';
type Response = Request['response'];
/**
 * Attempts to determine the size (in bytes) of a Hapi response
 * body based on the payload type. Falls back to `undefined`
 * if the size cannot be determined from the response object.
 *
 * @param response Hapi response object or Boom error
 *
 * @internal
 */
export declare function getResponsePayloadBytes(
  response: Response,
  log: Logger
): number | undefined;
export {};
