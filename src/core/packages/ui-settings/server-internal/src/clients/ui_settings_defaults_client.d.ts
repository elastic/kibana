import type { Logger } from '@kbn/logging';
import type { UiSettingsParams, UserProvidedValues } from '@kbn/core-ui-settings-common';
import { BaseUiSettingsClient } from './base_ui_settings_client';
export interface UiSettingsDefaultsClientOptions {
    overrides?: Record<string, any>;
    defaults?: Record<string, UiSettingsParams>;
    log: Logger;
}
/**
 * Implementation of the {@link IUiSettingsClient} that only gives a read-only access to the default UI Settings values and any overrides.
 */
export declare class UiSettingsDefaultsClient extends BaseUiSettingsClient {
    private readonly userProvided;
    constructor(options: UiSettingsDefaultsClientOptions);
    getUserProvided<T = unknown>(): Promise<Record<string, UserProvidedValues<T>>>;
    setMany(): Promise<void>;
    set(): Promise<void>;
    remove(): Promise<void>;
    removeMany(): Promise<void>;
}
