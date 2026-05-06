/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { UserStorageRegistrations, IUserStorageClient } from '@kbn/core-user-storage-common';

/** @public */
export interface UserStorageServiceSetup {
  /**
   * Register user storage keys with their schemas, defaults, and scopes.
   * Each key can only be registered once. Duplicate registrations throw.
   *
   * @example
   * ```ts
   * setup(core: CoreSetup) {
   *   core.userStorage.register({
   *     'navigation:layout': {
   *       schema: navLayoutSchema,
   *       defaultValue: defaultNavLayout,
   *       scope: 'space',
   *     },
   *   });
   * }
   * ```
   */
  register(definitions: UserStorageRegistrations): void;
}

/** @public */
export interface UserStorageServiceStart {
  /**
   * Create a {@link IUserStorageClient} scoped to the authenticated user
   * behind the given request. Returns `null` when the user has no
   * `profile_uid` (e.g. anonymous authentication).
   *
   * @example
   * ```ts
   * start(core: CoreStart) {
   *   const client = core.userStorage.asScoped(request);
   *   if (client) {
   *     const layout = await client.get('navigation:layout');
   *   }
   * }
   * ```
   */
  asScoped(request: KibanaRequest): IUserStorageClient | null;
}
