/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Lifecycle, Request, ResponseToolkit } from '@hapi/hapi';
import type { Logger } from '@kbn/logging';
import type { AuthenticationHandler, AuthResultParams } from '@kbn/core-http-server';
/** @internal */
export declare function adoptToHapiAuthFormat(
  fn: AuthenticationHandler,
  log: Logger,
  onAuth?: (request: Request, data: AuthResultParams) => void
): (request: Request, responseToolkit: ResponseToolkit) => Promise<Lifecycle.ReturnValue>;
