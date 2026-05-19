import type { Observable } from 'rxjs';
import { Subject } from 'rxjs';
import type { UserProvidedValues } from '@kbn/core-ui-settings-common';
import type { IUiSettingsClient, UiSettingsState, PublicUiSettingsParams } from '@kbn/core-ui-settings-browser';
import type { UiSettingsApi } from './ui_settings_api';
export interface UiSettingsClientParams {
    api: UiSettingsApi;
    defaults: Record<string, PublicUiSettingsParams>;
    initialSettings?: UiSettingsState;
    done$: Observable<unknown>;
}
export declare abstract class UiSettingsClientCommon implements IUiSettingsClient {
    protected readonly update$: Subject<{
        key: string;
        newValue: any;
        oldValue: any;
    }>;
    protected readonly updateErrors$: Subject<Error>;
    protected readonly api: UiSettingsApi;
    protected readonly defaults: Record<string, PublicUiSettingsParams>;
    protected cache: Record<string, PublicUiSettingsParams & UserProvidedValues>;
    constructor(params: UiSettingsClientParams);
    getAll(): Record<string, PublicUiSettingsParams & UserProvidedValues<any>>;
    get<T = any>(key: string, defaultOverride?: T): any;
    get$<T = any>(key: string, defaultOverride?: T): Observable<any>;
    set(key: string, value: any): Promise<boolean>;
    remove(key: string): Promise<boolean>;
    isDeclared(key: string): boolean;
    isDefault(key: string): boolean;
    isCustom(key: string): boolean;
    isOverridden(key: string): boolean;
    isStrictReadonly(key: string): boolean;
    getUpdate$(): Observable<{
        key: string;
        newValue: any;
        oldValue: any;
    }>;
    getUpdateErrors$(): Observable<Error>;
    validateValue(key: string, value: unknown): Promise<{
        successfulValidation: boolean;
        valid: boolean;
        errorMessage?: undefined;
    } | {
        successfulValidation: boolean;
        valid: boolean;
        errorMessage: string | undefined;
    } | {
        successfulValidation: boolean;
        valid?: undefined;
        errorMessage?: undefined;
    }>;
    protected assertUpdateAllowed(key: string): void;
    protected abstract update(key: string, newVal: any): Promise<boolean>;
    protected setLocally(key: string, newValue: any): void;
}
