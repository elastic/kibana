/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Kibana Preboot Service allows to control the boot flow of Kibana. Preboot plugins can use it to hold the boot until certain condition is met.
 *
 * @example
 * A plugin can supply a `Promise` to a `holdSetupUntilResolved` method to signal Kibana to initialize and start `standard` plugins only after this
 * `Promise` is resolved. If `Promise` is rejected, Kibana will shut down.
 * ```ts
 * core.preboot.holdSetupUntilResolved('Just waiting for 5 seconds',
 *   new Promise((resolve) => {
 *     setTimeout(resolve, 5000);
 *   })
 * );
 * ```
 *
 * If the supplied `Promise` resolves to an object with the `shouldReloadConfig` property set to `true`, Kibana will also reload its configuration from disk.
 * ```ts
 * let completeSetup: (result: { shouldReloadConfig: boolean }) => void;
 * core.preboot.holdSetupUntilResolved('Just waiting for 5 seconds before reloading configuration',
 *   new Promise<{ shouldReloadConfig: boolean }>((resolve) => {
 *     setTimeout(() => resolve({ shouldReloadConfig: true }), 5000);
 *   })
 * );
 * ```
 * @public
 */
export interface PrebootServicePreboot {
  /**
   * Indicates whether Kibana is currently on hold and cannot proceed to `setup` yet.
   */
  readonly isSetupOnHold: () => boolean;

  /**
   * Registers a `Promise` as a precondition before Kibana can proceed to `setup`. This method can be invoked multiple
   * times and from multiple `preboot` plugins. Kibana will proceed to `setup` only when all registered `Promises`
   * instances are resolved, or it will shut down if any of them is rejected.
   * @param reason A string that explains the reason why this promise should hold `setup`. It's supposed to be a human
   * readable string that will be recorded in the logs or standard output.
   * @param promise A `Promise` that should resolved before Kibana can proceed to `setup`.
   */
  readonly holdSetupUntilResolved: (
    reason: string,
    promise: Promise<{ shouldReloadConfig: boolean } | undefined>
  ) => void;
}
