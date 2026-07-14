import { UiSettingsClientCommon } from './ui_settings_client_common';
import type { UiSettingsServiceOptions } from '../types';
/**
 * Global UiSettingsClient
 */
export declare class UiSettingsGlobalClient extends UiSettingsClientCommon {
    constructor(options: UiSettingsServiceOptions);
    setMany(changes: Record<string, any>, options?: {
        validateKeys?: boolean;
    }): Promise<void>;
    set(key: string, value: any): Promise<void>;
}
