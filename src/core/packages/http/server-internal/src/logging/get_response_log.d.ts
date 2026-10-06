/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Request } from '@hapi/hapi';
import type { LogMeta, Logger } from '@kbn/logging';
/**
 * Converts a hapi `Request` into ECS-compliant `LogMeta` for logging.
 *
 * @internal
 */
export declare function getEcsResponseLog(
  request: Request,
  log: Logger
): {
  message: string;
  meta: LogMeta;
};
export declare function getSlimInfoResponseLog(request: Request): {
  message: string;
  meta: LogMeta;
};
