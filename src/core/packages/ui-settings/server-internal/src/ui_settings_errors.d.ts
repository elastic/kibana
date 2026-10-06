/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare class CannotOverrideError extends Error {
  cause?: Error;
  constructor(message: string, cause?: Error);
}
export declare class SettingNotRegisteredError extends Error {
  constructor(key: string);
}
export declare class ValidationSettingNotFoundError extends Error {
  constructor(key: string);
}
export declare class ValidationBadValueError extends Error {
  constructor();
}
