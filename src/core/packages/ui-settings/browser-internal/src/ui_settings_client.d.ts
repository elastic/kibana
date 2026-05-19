import type { UiSettingsClientParams } from './ui_settings_client_common';
import { UiSettingsClientCommon } from './ui_settings_client_common';
export declare class UiSettingsClient extends UiSettingsClientCommon {
    constructor(params: UiSettingsClientParams);
    update(key: string, newVal: any): Promise<boolean>;
}
