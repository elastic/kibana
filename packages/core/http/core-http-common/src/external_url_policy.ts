/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * A policy describing whether access to an external destination is allowed.
 * @public
 */
export interface IExternalUrlPolicy {
  /**
   * Indicates if this policy allows or denies access to the described destination.
   */
  allow: boolean;

  /**
   * Optional host describing the external destination.
   * May be combined with `protocol`.
   *
   * @example
   * ```ts
   * // allows access to all of google.com, using any protocol.
   * allow: true,
   * host: 'google.com'
   * ```
   */
  host?: string;

  /**
   * Optional protocol describing the external destination.
   * May be combined with `host`.
   *
   * @example
   * ```ts
   * // allows access to all destinations over the `https` protocol.
   * allow: true,
   * protocol: 'https'
   * ```
   */
  protocol?: string;
}
