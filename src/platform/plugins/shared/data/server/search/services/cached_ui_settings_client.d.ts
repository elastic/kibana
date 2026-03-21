import type { IUiSettingsClient } from '@kbn/core/server';
/**
 * {@link IUiSettingsClient} wrapper to ensure uiSettings requested only once within a single KibanaRequest,
 * {@link IUiSettingsClient} has its own cache, but it doesn't cache pending promises, so this produces two requests:
 *
 * const promise1 = uiSettings.get(1); // fetches config
 * const promise2 = uiSettings.get(2); // fetches config
 *
 * And {@link CachedUiSettingsClient} solves it, so this produced a single request:
 *
 * const promise1 = cachedUiSettingsClient.get(1); // fetches config
 * const promise2 = cachedUiSettingsClient.get(2); // reuses existing promise
 *
 * @internal
 */
export declare class CachedUiSettingsClient implements Pick<IUiSettingsClient, 'get'> {
    private readonly client;
    private cache;
    constructor(client: IUiSettingsClient);
    get<T = any>(key: string): Promise<T>;
}
