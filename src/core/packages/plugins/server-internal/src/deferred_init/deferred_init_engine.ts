/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Decides when each plugin's `initialize()` runs. Every run starts once every plugin has started.
 * Policy that needs a view across plugins, such as a concurrency limit or retries, belongs here.
 *
 * @internal
 */
export class DeferredInitEngine {
  /** Starts each run in the given order without waiting for any of them. */
  public startInitialization(runs: ReadonlyArray<() => void>): void {
    runs.forEach((run) => run());
  }
}
