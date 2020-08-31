/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
