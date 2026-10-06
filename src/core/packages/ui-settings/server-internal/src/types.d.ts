import type { IUiSettingsClient, UiSettingsServiceSetup, UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { UiSettingsParams } from '@kbn/core-ui-settings-common';
import type { Logger } from '@kbn/logging';
import type { NamespacedCache } from './namespaced_cache';
/** @internal */
export interface InternalUiSettingsServicePreboot {
    /**
     * Creates a {@link IUiSettingsClient} that returns default values for the Core uiSettings.
     */
    createDefaultsClient(): IUiSettingsClient;
}
/** @internal */
export type InternalUiSettingsServiceSetup = UiSettingsServiceSetup;
/** @internal */
export type InternalUiSettingsServiceStart = UiSettingsServiceStart;
/** @internal */
export interface UiSettingsServiceOptions {
    type: 'config' | 'config-global';
    id: string;
    buildNum: number;
    savedObjectsClient: SavedObjectsClientContract;
    overrides?: Record<string, any>;
    defaults?: Record<string, UiSettingsParams>;
    log: Logger;
    /** Shared getUserProvided cache instance (injected from service) */
    sharedUserProvidedCache?: NamespacedCache<Record<string, any>>;
    /** Namespace for cache keys (typically space ID) */
    namespace: string;
}
