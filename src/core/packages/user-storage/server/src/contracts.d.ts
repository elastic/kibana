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
