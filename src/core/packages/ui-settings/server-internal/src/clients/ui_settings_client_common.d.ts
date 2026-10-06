/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UiSettingsServiceOptions } from '../types';
import { BaseUiSettingsClient } from './base_ui_settings_client';
interface UserProvidedValue<T = unknown> {
  userValue?: T;
  isOverridden?: boolean;
}
type UserProvided<T = unknown> = Record<string, UserProvidedValue<T>>;
/**
 * Common logic for setting / removing keys in a {@link IUiSettingsClient} implementation
 */
export declare abstract class UiSettingsClientCommon extends BaseUiSettingsClient {
  private readonly type;
  private readonly id;
  private readonly buildNum;
  private readonly savedObjectsClient;
  private readonly sharedUserProvidedCache?;
  private readonly namespace;
  constructor(options: UiSettingsServiceOptions);
  getUserProvided<T = unknown>(bypassCache?: boolean): Promise<UserProvided<T>>;
  private applyOverrides;
  private computeUserProvided;
  setMany(
    changes: Record<string, any>,
    {
      handleWriteErrors,
    }?: {
      validateKeys?: boolean;
      handleWriteErrors?: boolean;
    }
  ): Promise<void>;
  set(key: string, value: any): Promise<void>;
  remove(key: string): Promise<void>;
  removeMany(
    keys: string[],
    options?: {
      validateKeys?: boolean;
      handleWriteErrors?: boolean;
    }
  ): Promise<void>;
  private assertUpdateAllowed;
  private onWriteHook;
  private onReadHook;
  private write;
  private read;
  private isIgnorableError;
}
export {};
