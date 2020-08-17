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

import { CoreSetup, Plugin, PluginInitializerContext } from 'src/core/server';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { TimelionConfigType } from './config';

export class TimelionPlugin implements Plugin {
  constructor(context: PluginInitializerContext<TimelionConfigType>) {}

  public setup(core: CoreSetup) {
    core.capabilities.registerProvider(() => ({
      timelion: {
        save: true,
      },
    }));
    core.savedObjects.registerType({
      name: 'timelion-sheet',
      hidden: false,
      namespaceType: 'single',
      mappings: {
        properties: {
          description: { type: 'text' },
          hits: { type: 'integer' },
          kibanaSavedObjectMeta: {
            properties: {
              searchSourceJSON: { type: 'text' },
            },
          },
          timelion_chart_height: { type: 'integer' },
          timelion_columns: { type: 'integer' },
          timelion_interval: { type: 'keyword' },
          timelion_other_interval: { type: 'keyword' },
          timelion_rows: { type: 'integer' },
          timelion_sheet: { type: 'text' },
          title: { type: 'text' },
          version: { type: 'integer' },
        },
      },
    });

    core.uiSettings.register({
      'timelion:showTutorial': {
        name: i18n.translate('timelion.uiSettings.showTutorialLabel', {
          defaultMessage: 'Show tutorial',
        }),
        value: false,
        description: i18n.translate('timelion.uiSettings.showTutorialDescription', {
          defaultMessage: 'Should I show the tutorial by default when entering the timelion app?',
        }),
        category: ['timelion'],
        schema: schema.boolean(),
      },
      'timelion:default_columns': {
        name: i18n.translate('timelion.uiSettings.defaultColumnsLabel', {
          defaultMessage: 'Default columns',
        }),
        value: 2,
        description: i18n.translate('timelion.uiSettings.defaultColumnsDescription', {
          defaultMessage: 'Number of columns on a timelion sheet by default',
        }),
        category: ['timelion'],
        schema: schema.number(),
      },
      'timelion:default_rows': {
        name: i18n.translate('timelion.uiSettings.defaultRowsLabel', {
          defaultMessage: 'Default rows',
        }),
        value: 2,
        description: i18n.translate('timelion.uiSettings.defaultRowsDescription', {
          defaultMessage: 'Number of rows on a timelion sheet by default',
        }),
        category: ['timelion'],
        schema: schema.number(),
      },
    });
  }
  start() {}
  stop() {}
}
