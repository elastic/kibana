/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { IUserUiSettingsClient } from '@kbn/core-ui-settings-server/src';
import type { UiSettingsServiceOptions } from '../types';
import { BaseUiSettingsClient } from './base_ui_settings_client';

interface UserProvidedValue<T = unknown> {
  userValue?: T;
  isOverridden?: boolean;
}

type UserProvided<T = unknown> = Record<string, UserProvidedValue<T>>;

/**
 * Common logic for setting / removing keys in a {@link IUserUiSettingsClient} implementation
 */
export class UiSettingsUserClient extends BaseUiSettingsClient implements IUserUiSettingsClient {
  private readonly userProfileSettingsClient: UiSettingsServiceOptions['userProfileSettingsClient'];
  private readonly request?: KibanaRequest;

  constructor(options: UiSettingsServiceOptions, request?: KibanaRequest) {
    super(options);
    const { userProfileSettingsClient } = options;
    this.userProfileSettingsClient = userProfileSettingsClient;
    this.request = request;
  }

  async getUserProfileSettings(): Promise<Record<string, string>> {
    let result = {} as Record<string, string>;

    if (this.request) {
      result = (await this.userProfileSettingsClient?.get(this.request)) || {};
    } else {
      this.log.warn('Request not set, unable to retrieve User Settings');
    }

    return result;
  }

  async getUserProvided<T = unknown>(): Promise<UserProvided<T>> {
    this.log.warn('`getUserProvided` operation is not supported for User Settings.');
    return {};
  }

  async setMany(changes: Record<string, any>) {
    this.log.warn('`setMany` operation is not supported for User Settings.');
  }

  async set(key: string, value: any) {
    this.log.warn('`set` operation is not supported for User Settings.');
  }

  async remove(key: string) {
    this.log.warn('`remove` operation is not supported for User Settings.');
  }

  async removeMany(keys: string[]) {
    this.log.warn('`removeMany` operation is not supported for User Settings.');
  }
}
