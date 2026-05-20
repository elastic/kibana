import type { IUiSettingsClient } from '@kbn/core/server';
import type { UiSettingsCommon } from '../common';
export declare class UiSettingsServerToCommon implements UiSettingsCommon {
    private uiSettings;
    constructor(uiSettings: IUiSettingsClient);
    get<T = unknown>(key: string): Promise<T | undefined>;
    getAll<T = unknown>(): Promise<Record<string, T>>;
    set(key: string, value: unknown): Promise<void>;
    remove(key: string): Promise<void>;
}
