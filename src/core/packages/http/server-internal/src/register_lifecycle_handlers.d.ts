/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Env } from '@kbn/config';
import type { Logger } from '@kbn/logging';
import type { HttpConfig } from './http_config';
import type { CoreHandlerDependencies } from './http_server';
export declare const registerCoreHandlers: (
  registrar: CoreHandlerDependencies,
  config: HttpConfig,
  env: Env,
  log: Logger
) => void;
