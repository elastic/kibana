/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { HttpConfig } from './http_config';
export declare class HttpsRedirectServer {
  private readonly log;
  private server?;
  constructor(log: Logger);
  start(config: HttpConfig): Promise<void>;
  stop(): Promise<void>;
}
