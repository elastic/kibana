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

import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { CoreSetup, Plugin, PluginInitializerContext } from 'src/core/server';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { TimelionConfigType } from './config';

const experimentalLabel = i18n.translate('timelion.uiSettings.experimentalLabel', {
  defaultMessage: 'experimental',
});

export class TimelionPlugin implements Plugin {
  private readonly config$: Observable<TimelionConfigType>;

  constructor(context: PluginInitializerContext<TimelionConfigType>) {
    this.config$ = context.config.create();
  }

  async setup(core: CoreSetup) {
    const config = await this.config$.pipe(first()).toPromise();
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
      'timelion:es.timefield': {
        name: i18n.translate('timelion.uiSettings.timeFieldLabel', {
          defaultMessage: 'Time field',
        }),
        value: '@timestamp',
        description: i18n.translate('timelion.uiSettings.timeFieldDescription', {
          defaultMessage: 'Default field containing a timestamp when using {esParam}',
          values: { esParam: '.es()' },
        }),
        category: ['timelion'],
        schema: schema.string(),
      },
      'timelion:es.default_index': {
        name: i18n.translate('timelion.uiSettings.defaultIndexLabel', {
          defaultMessage: 'Default index',
        }),
        value: '_all',
        description: i18n.translate('timelion.uiSettings.defaultIndexDescription', {
          defaultMessage: 'Default elasticsearch index to search with {esParam}',
          values: { esParam: '.es()' },
        }),
        category: ['timelion'],
        schema: schema.string(),
      },
      'timelion:target_buckets': {
        name: i18n.translate('timelion.uiSettings.targetBucketsLabel', {
          defaultMessage: 'Target buckets',
        }),
        value: 200,
        description: i18n.translate('timelion.uiSettings.targetBucketsDescription', {
          defaultMessage: 'The number of buckets to shoot for when using auto intervals',
        }),
        category: ['timelion'],
        schema: schema.number(),
      },
      'timelion:max_buckets': {
        name: i18n.translate('timelion.uiSettings.maximumBucketsLabel', {
          defaultMessage: 'Maximum buckets',
        }),
        value: 2000,
        description: i18n.translate('timelion.uiSettings.maximumBucketsDescription', {
          defaultMessage: 'The maximum number of buckets a single datasource can return',
        }),
        category: ['timelion'],
        schema: schema.number(),
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
      'timelion:min_interval': {
        name: i18n.translate('timelion.uiSettings.minimumIntervalLabel', {
          defaultMessage: 'Minimum interval',
        }),
        value: '1ms',
        description: i18n.translate('timelion.uiSettings.minimumIntervalDescription', {
          defaultMessage: 'The smallest interval that will be calculated when using "auto"',
          description:
            '"auto" is a technical value in that context, that should not be translated.',
        }),
        category: ['timelion'],
        schema: schema.string(),
      },
      'timelion:graphite.url': {
        name: i18n.translate('timelion.uiSettings.graphiteURLLabel', {
          defaultMessage: 'Graphite URL',
          description:
            'The URL should be in the form of https://www.hostedgraphite.com/UID/ACCESS_KEY/graphite',
        }),
        value: config.graphiteUrls && config.graphiteUrls.length ? config.graphiteUrls[0] : null,
        description: i18n.translate('timelion.uiSettings.graphiteURLDescription', {
          defaultMessage:
            '{experimentalLabel} The <a href="https://www.hostedgraphite.com/UID/ACCESS_KEY/graphite" target="_blank" rel="noopener">URL</a> of your graphite host',
          values: { experimentalLabel: `<em>[${experimentalLabel}]</em>` },
        }),
        type: 'select',
        options: config.graphiteUrls,
        category: ['timelion'],
        schema: schema.nullable(schema.string()),
      },
      'timelion:quandl.key': {
        name: i18n.translate('timelion.uiSettings.quandlKeyLabel', {
          defaultMessage: 'Quandl key',
        }),
        value: 'someKeyHere',
        description: i18n.translate('timelion.uiSettings.quandlKeyDescription', {
          defaultMessage: '{experimentalLabel} Your API key from www.quandl.com',
          values: { experimentalLabel: `<em>[${experimentalLabel}]</em>` },
        }),
        category: ['timelion'],
        schema: schema.string(),
      },
    });
  }
  start() {}
  stop() {}
}
