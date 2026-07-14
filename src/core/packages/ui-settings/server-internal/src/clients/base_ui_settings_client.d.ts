import type { Logger } from '@kbn/logging';
import type { GetUiSettingsContext, UiSettingsParams, UserProvidedValues } from '@kbn/core-ui-settings-common';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
export interface BaseUiSettingsDefaultsClientOptions {
    overrides?: Record<string, any>;
    defaults?: Record<string, UiSettingsParams>;
    log: Logger;
}
/**
 * Base implementation of the {@link IUiSettingsClient}.
 */
export declare abstract class BaseUiSettingsClient implements IUiSettingsClient {
    protected readonly defaults: Record<string, UiSettingsParams>;
    protected readonly overrides: Record<string, any>;
    protected readonly log: Logger;
    protected constructor(options: BaseUiSettingsDefaultsClientOptions);
    getRegistered(): Record<string, Omit<UiSettingsParams<unknown>, "schema">>;
    get<T = any>(key: string, context?: GetUiSettingsContext): Promise<T>;
    getAll<T = any>(context?: GetUiSettingsContext): Promise<Record<string, T>>;
    isOverridden(key: string): boolean;
    isSensitive(key: string): boolean;
    validate(key: string, value: unknown): Promise<{
        valid: boolean;
        errorMessage: any;
    } | {
        valid: boolean;
        errorMessage?: undefined;
    }>;
    protected validateKey(key: string, value: unknown): void;
    private getDefaultValues;
    abstract getUserProvided<T = any>(): Promise<Record<string, UserProvidedValues<T>>>;
    abstract setMany(changes: Record<string, any>): Promise<void>;
    abstract set(key: string, value: any): Promise<void>;
    abstract remove(key: string): Promise<void>;
    abstract removeMany(keys: string[]): Promise<void>;
}
