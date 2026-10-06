import type { IUiSettingsClient, PublicUiSettingsParams, UserProvidedValues } from '@kbn/core/public';
import type { UiSettingsCommon } from '../common';
export declare class UiSettingsPublicToCommon implements UiSettingsCommon {
    private uiSettings;
    constructor(uiSettings: IUiSettingsClient);
    get<T = unknown>(key: string): Promise<T | undefined>;
    getAll<T = unknown>(): Promise<Record<string, (PublicUiSettingsParams & UserProvidedValues<T>) | undefined>>;
    set(key: string, value: unknown): Promise<void>;
    remove(key: string): Promise<void>;
}
