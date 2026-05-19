import type { SavedObjectsTaggingApi } from './api';
export interface SavedObjectTaggingOssPluginSetup {
    /**
     * Register a provider for the tagging API.
     *
     * Only one provider can be registered, subsequent calls to this method will fail.
     *
     * @remarks The promise should not resolve any later than the end of the start lifecycle
     *          (after `getStartServices` resolves). Not respecting this condition may cause
     *          runtime failures.
     */
    registerTaggingApi(provider: Promise<SavedObjectsTaggingApi>): void;
}
export interface SavedObjectTaggingOssPluginStart {
    /**
     * Returns true if the tagging feature is available (if a provider registered the API)
     */
    isTaggingAvailable(): boolean;
    /**
     * Returns the tagging API, if registered.
     * This will always returns a value if `isTaggingAvailable` returns true, and undefined otherwise.
     */
    getTaggingApi(): SavedObjectsTaggingApi | undefined;
}
