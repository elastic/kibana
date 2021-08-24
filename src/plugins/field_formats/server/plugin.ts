/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { has } from 'lodash';
import type { CoreSetup, CoreStart } from '../../../core/server';
import type { Plugin, PluginInitializerContext } from '../../../core/server/plugins/types';
import type { IUiSettingsClient } from '../../../core/server/ui_settings/types';
import { baseFormatters } from '../common/constants/base_formatters';
import { FieldFormatsRegistry } from '../common/field_formats_registry';
import type { FieldFormatInstanceType } from '../common/types';
import { DateNanosFormat } from './lib/converters/date_nanos_server';
import { DateFormat } from './lib/converters/date_server';
import type { FieldFormatsSetup, FieldFormatsStart } from './types';
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
