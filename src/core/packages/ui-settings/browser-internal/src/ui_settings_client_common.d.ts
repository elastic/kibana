/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { Subject } from 'rxjs';
import type { UserProvidedValues } from '@kbn/core-ui-settings-common';
import type {
  IUiSettingsClient,
  UiSettingsState,
  PublicUiSettingsParams,
} from '@kbn/core-ui-settings-browser';
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
  validateValue(
    key: string,
    value: unknown
  ): Promise<
    | {
        successfulValidation: boolean;
        valid: boolean;
        errorMessage?: undefined;
      }
    | {
        successfulValidation: boolean;
        valid: boolean;
        errorMessage: string | undefined;
      }
    | {
        valid?: undefined;
        errorMessage?: undefined;
        successfulValidation: boolean;
      }
  >;
  protected assertUpdateAllowed(key: string): void;
  protected abstract update(key: string, newVal: any): Promise<boolean>;
  protected setLocally(key: string, newValue: any): void;
}
