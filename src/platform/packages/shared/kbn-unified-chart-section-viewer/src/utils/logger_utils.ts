/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Narrows a catch block's value to the shape accepted by `Logger.error` /
 * `Logger.warn`: an `Error` instance (auto-serialized to ECS by the platform)
 * or a plain string.
 */
export const toLoggable = (value: unknown): Error | string =>
  value instanceof Error ? value : String(value);
