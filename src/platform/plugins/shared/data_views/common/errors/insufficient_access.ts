/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Error thrown when action attempted without sufficient access.
 * @constructor
 * @param {string} message - Saved object id of data view for display in error message
 */
export class DataViewInsufficientAccessError extends Error {
  /**
   * constructor
   * @param {string} message - Saved object id of data view for display in error message
   */
  constructor(savedObjectId?: string) {
    super(`Operation failed due to insufficient access, id: ${savedObjectId}`);
    this.name = 'DataViewInsufficientAccessError';
  }
}
