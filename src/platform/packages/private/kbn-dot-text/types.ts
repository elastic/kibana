/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface Options {
  /**
   * The path to the .text file if available.
   */
  path?: string;
  /**
   * The content of the .text file if available.
   */
  content?: string;
}

export interface SyncOptions extends Options {
  /** the content of the .text file to transform */
  content: string;
}

export interface Result {
  /**
   * The output of the .text-to-CommonJS transform
   */
  source: string;
}
