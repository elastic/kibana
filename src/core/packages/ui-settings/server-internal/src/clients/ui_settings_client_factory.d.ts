import type { UiSettingsServiceOptions } from '../..';
import { UiSettingsClient } from './ui_settings_client';
import { UiSettingsGlobalClient } from './ui_settings_global_client';
export declare class UiSettingsClientFactory {
    static create: (options: UiSettingsServiceOptions) => UiSettingsClient | UiSettingsGlobalClient;
}
