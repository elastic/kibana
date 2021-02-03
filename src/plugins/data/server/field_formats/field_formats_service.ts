/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { has } from 'lodash';
import {
  FieldFormatsRegistry,
  FieldFormatInstanceType,
  baseFormatters,
} from '../../common/field_formats';
import { IUiSettingsClient } from '../../../../core/server';
import { DateFormat, DateNanosFormat } from './converters';

export class FieldFormatsService {
  private readonly fieldFormatClasses: FieldFormatInstanceType[] = [
    DateFormat,
    DateNanosFormat,
    ...baseFormatters,
  ];

  public setup() {
    return {
      register: (customFieldFormat: FieldFormatInstanceType) =>
        this.fieldFormatClasses.push(customFieldFormat),
    };
  }

  public start() {
    return {
      fieldFormatServiceFactory: async (uiSettings: IUiSettingsClient) => {
        const fieldFormatsRegistry = new FieldFormatsRegistry();
        const uiConfigs = await uiSettings.getAll();
        const registeredUiSettings = uiSettings.getRegistered();

        Object.keys(registeredUiSettings).forEach((key) => {
          if (has(uiConfigs, key) && registeredUiSettings[key].type === 'json') {
            uiConfigs[key] = JSON.parse(uiConfigs[key]);
          }
        });

        fieldFormatsRegistry.init((key: string) => uiConfigs[key], {}, this.fieldFormatClasses);

        return fieldFormatsRegistry;
      },
    };
  }
}

/** @public */
export type FieldFormatsSetup = ReturnType<FieldFormatsService['setup']>;

/** @public */
export type FieldFormatsStart = ReturnType<FieldFormatsService['start']>;
