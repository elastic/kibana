/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaRequest } from './router';
/**
 * Provides an interface to store and retrieve data across requests.
 * @public
 */
export interface SessionStorage<T> {
  /**
   * Retrieves session value from the session storage.
   */
  get(): Promise<T | null>;
  /**
   * Puts current session value into the session storage.
   * @param sessionValue - value to put
   */
  set(sessionValue: T): void;
  /**
   * Clears current session.
   */
  clear(): void;
}

/**
 * SessionStorage factory to bind one to an incoming request
 * @public */
export interface SessionStorageFactory<T> {
  asScoped: (request: KibanaRequest) => SessionStorage<T>;
}
