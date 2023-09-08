/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { omit } from 'lodash';
import type { Logger } from '@kbn/logging';
import type { UiSettingsParams, UserProvidedValues } from '@kbn/core-ui-settings-common';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';

export interface BaseUiSettingsDefaultsClientOptions {
  overrides?: Record<string, any>;
  defaults?: Record<string, UiSettingsParams>;
  log: Logger;
}

/**
 * Base implementation of the {@link IUiSettingsClient}.
 */
export abstract class BaseUiSettingsClient implements IUiSettingsClient {
  private readonly defaults: Record<string, UiSettingsParams>;
  private readonly defaultValues: Record<string, unknown>;
  protected readonly overrides: Record<string, any>;
  protected readonly log: Logger;

  protected constructor(options: BaseUiSettingsDefaultsClientOptions) {
    const { defaults = {}, overrides = {}, log } = options;
    this.log = log;
    this.overrides = overrides;

    this.defaults = defaults;
    this.defaultValues = Object.fromEntries(
      Object.entries(this.defaults).map(([key, { value }]) => [key, value])
    );
  }

  getRegistered() {
    const copiedDefaults: Record<string, Omit<UiSettingsParams, 'schema'>> = {};
    for (const [key, value] of Object.entries(this.defaults)) {
      copiedDefaults[key] = omit(value, 'schema');
    }
    return copiedDefaults;
  }

  async get<T = any>(key: string): Promise<T> {
    const all = await this.getAll();
    return all[key] as T;
  }

  async getAll<T = any>() {
    const result = { ...this.defaultValues };

    const userProvided = await this.getUserProvided();
    Object.keys(userProvided).forEach((key) => {
      if (userProvided[key].userValue !== undefined) {
        result[key] = userProvided[key].userValue;
      }
    });

    return Object.freeze(result) as Record<string, T>;
  }

  isOverridden(key: string) {
    return this.overrides.hasOwnProperty(key);
  }

  isSensitive(key: string): boolean {
    const definition = this.defaults[key];
    return !!definition?.sensitive;
  }

  protected validateKey(key: string, value: unknown) {
    const definition = this.defaults[key];
    if (value === null || definition === undefined) return;
    if (definition.schema) {
      definition.schema.validate(value, {}, `validation [${key}]`);
    }
  }

  abstract getUserProvided<T = any>(): Promise<Record<string, UserProvidedValues<T>>>;

  abstract setMany(changes: Record<string, any>): Promise<void>;

  abstract set(key: string, value: any): Promise<void>;

  abstract remove(key: string): Promise<void>;

  abstract removeMany(keys: string[]): Promise<void>;
}
