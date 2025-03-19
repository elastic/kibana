/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line max-classes-per-file
export class CannotOverrideError extends Error {
  public cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.cause = cause;

    // Set the prototype explicitly, see:
    // https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, CannotOverrideError.prototype);
  }
}

export class SettingNotRegisteredError extends Error {
  constructor(key: string) {
    super(
      `Global setting ${key} is not registered. Global settings need to be registered before they can be set`
    );
  }
}

export class ValidationSettingNotFoundError extends Error {
  constructor(key: string) {
    super(`Setting with a key [${key}] does not exist.`);
  }
}

export class ValidationBadValueError extends Error {
  constructor() {
    super('No value was specified.');
  }
}
