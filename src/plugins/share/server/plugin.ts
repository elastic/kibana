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

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { CoreSetup, Plugin, PluginInitializerContext } from 'kibana/server';
import { createRoutes } from './routes/create_routes';
import { url } from './saved_objects';
import { CSV_SEPARATOR_SETTING, CSV_QUOTE_VALUES_SETTING } from '../common/constants';

export class SharePlugin implements Plugin {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public async setup(core: CoreSetup) {
    createRoutes(core, this.initializerContext.logger.get());
    core.savedObjects.registerType(url);
    core.uiSettings.register({
      [CSV_SEPARATOR_SETTING]: {
        name: i18n.translate('share.advancedSettings.csv.separatorTitle', {
          defaultMessage: 'CSV separator',
        }),
        value: ',',
        description: i18n.translate('share.advancedSettings.csv.separatorText', {
          defaultMessage: 'Separate exported values with this string',
        }),
        schema: schema.string(),
      },
      [CSV_QUOTE_VALUES_SETTING]: {
        name: i18n.translate('share.advancedSettings.csv.quoteValuesTitle', {
          defaultMessage: 'Quote CSV values',
        }),
        value: true,
        description: i18n.translate('share.advancedSettings.csv.quoteValuesText', {
          defaultMessage: 'Should values be quoted in csv exports?',
        }),
        schema: schema.boolean(),
      },
    });
  }

  public start() {
    this.initializerContext.logger.get().debug('Starting plugin');
  }

  public stop() {
    this.initializerContext.logger.get().debug('Stopping plugin');
  }
}
