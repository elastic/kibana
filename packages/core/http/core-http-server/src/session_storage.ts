/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from './router';

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

/**
 * Configuration used to create HTTP session storage based on top of cookie mechanism.
 * @public
 */
export interface SessionStorageCookieOptions<T> {
  /**
   * Name of the session cookie.
   */
  name: string;
  /**
   * A key used to encrypt a cookie's value. Should be at least 32 characters long.
   */
  encryptionKey: string;
  /**
   * Function called to validate a cookie's decrypted value.
   */
  validate: (sessionValue: T | T[]) => SessionCookieValidationResult;
  /**
   * Flag indicating whether the cookie should be sent only via a secure connection.
   */
  isSecure: boolean;
  /**
   * Defines SameSite attribute of the Set-Cookie Header.
   * https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
   */
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Return type from a function to validate cookie contents.
 * @public
 */
export interface SessionCookieValidationResult {
  /**
   * Whether the cookie is valid or not.
   */
  isValid: boolean;
  /**
   * The "Path" attribute of the cookie; if the cookie is invalid, this is used to clear it.
   */
  path?: string;
}
