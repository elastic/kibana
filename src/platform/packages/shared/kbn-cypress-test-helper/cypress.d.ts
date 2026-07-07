/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// / <reference types="cypress" />

declare namespace Cypress {
  interface Chainable<Subject = any> {
    /**
     * Continuously call provided callback function until it either return `true`
     * or fail if `timeout` is reached.
     * @param fn
     * @param options
     * @param message
     */
    waitUntil(
      fn: (subject?: any) => boolean | Promise<boolean> | Chainable<boolean>,
      options?: Partial<{
        interval: number;
        timeout: number;
      }>,
      message?: string
    ): Chainable<Subject>;
    /**
     * Waits for no network activity for a given URL.
     * @param url Partial URL to match requests
     * @param timeout Optional timeout in ms (default: 500)
     */
    waitForNetworkIdle(url: string, timeout?: number): Chainable<Subject>;
  }
}
