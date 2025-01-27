/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type LoginFunction = (role: string) => Promise<void>;

export interface BrowserAuthFixture {
  /**
   * Logs in as a user with viewer-only permissions.
   * @returns A Promise that resolves once the cookie in browser is set.
   */
  loginAsViewer: () => Promise<void>;
  /**
   * Logs in as a user with administrative privileges
   * @returns A Promise that resolves once the cookie in browser is set.
   */
  loginAsAdmin: () => Promise<void>;
  /**
   * Logs in as a user with elevated, but not admin, permissions.
   * @returns A Promise that resolves once the cookie in browser is set.
   */
  loginAsPrivilegedUser: () => Promise<void>;
}

export { browserAuthParallelFixture } from './parallel';
export { browserAuthFixture } from './single_thread';
