/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { has } from 'lodash';
import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  IUiSettingsClient,
} from '@kbn/core/server';
import { FieldFormatsStart, FieldFormatsSetup } from './types';
import { DateFormat, DateNanosFormat } from './lib/converters';
import { baseFormatters, FieldFormatInstanceType, FieldFormatsRegistry } from '../common';
import { getUiSettings } from './ui_settings';

export class FieldFormatsPlugin implements Plugin<FieldFormatsSetup, FieldFormatsStart> {
  private readonly fieldFormats: FieldFormatInstanceType[] = [
    DateFormat,
    DateNanosFormat,
    ...baseFormatters,
  ];

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    core.uiSettings.register(getUiSettings());

    return {
      register: (customFieldFormat: FieldFormatInstanceType) =>
        this.fieldFormats.push(customFieldFormat),
    };
  }

  public start(core: CoreStart) {
    return {
      fieldFormatServiceFactory: async (uiSettings: IUiSettingsClient) => {
        const fieldFormatsRegistry = new FieldFormatsRegistry();
        const coreUiConfigs = await uiSettings.getAll();
        const registeredUiSettings = uiSettings.getRegistered();
        const uiConfigs = { ...coreUiConfigs };

        Object.keys(registeredUiSettings).forEach((key) => {
          if (has(uiConfigs, key) && registeredUiSettings[key].type === 'json') {
            uiConfigs[key] = JSON.parse(uiConfigs[key]);
          }
        });

        fieldFormatsRegistry.init((key: string) => uiConfigs[key], {}, this.fieldFormats);

        return fieldFormatsRegistry;
      },
    };
  }

  public stop() {}
}
