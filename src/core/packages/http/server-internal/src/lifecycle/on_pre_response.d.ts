/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Lifecycle, Request, ResponseToolkit as HapiResponseToolkit } from '@hapi/hapi';
import type { Logger } from '@kbn/logging';
import type { OnPreResponseHandler } from '@kbn/core-http-server';
/**
 * Adopt custom request interceptor to Hapi lifecycle system.
 * @param fn - an extension point allowing to perform custom logic for
 * incoming HTTP requests.
 */
export declare function adoptToHapiOnPreResponseFormat(
  fn: OnPreResponseHandler,
  log: Logger
): (request: Request, responseToolkit: HapiResponseToolkit) => Promise<Lifecycle.ReturnValue>;
