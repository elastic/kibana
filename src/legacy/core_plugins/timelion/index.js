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

import { resolve } from 'path';
import { i18n } from '@kbn/i18n';

const experimentalLabel = i18n.translate('timelion.uiSettings.experimentalLabel', {
  defaultMessage: 'experimental'
});

export default function (kibana) {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch'],

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        ui: Joi.object({
          enabled: Joi.boolean().default(false),
        }).default(),
      }).default();
    },

    uiCapabilities() {
      return {
        timelion: {
          save: true,
        }
      };
    },

    uiExports: {
      app: {
        title: 'Timelion',
        order: -1000,
        icon: 'plugins/timelion/icon.svg',
        euiIconType: 'timelionApp',
        main: 'plugins/timelion/app',
      },
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      hacks: [
        'plugins/timelion/hacks/toggle_app_link_in_nav',
        'plugins/timelion/lib/panel_registry',
        'plugins/timelion/panels/timechart/timechart'
      ],
      injectDefaultVars(server) {
        return {
          timelionUiEnabled: server.config().get('timelion.ui.enabled'),
        };
      },
      visTypes: [
        'plugins/timelion/vis'
      ],
      interpreter: ['plugins/timelion/timelion_vis_fn'],
      home: [
        'plugins/timelion/register_feature'
      ],
      mappings: require('./mappings.json'),
      uiSettingDefaults: {
        'timelion:showTutorial': {
          name: i18n.translate('timelion.uiSettings.showTutorialLabel', {
            defaultMessage: 'Show tutorial'
          }),
          value: false,
          description: i18n.translate('timelion.uiSettings.showTutorialDescription', {
            defaultMessage: 'Should I show the tutorial by default when entering the timelion app?'
          }),
          category: ['timelion'],
        },
        'timelion:es.timefield': {
          name: i18n.translate('timelion.uiSettings.timeFieldLabel', {
            defaultMessage: 'Time field'
          }),
          value: '@timestamp',
          description: i18n.translate('timelion.uiSettings.timeFieldDescription', {
            defaultMessage: 'Default field containing a timestamp when using {esParam}',
            values: { esParam: '.es()' }
          }),
          category: ['timelion'],
        },
        'timelion:es.default_index': {
          name: i18n.translate('timelion.uiSettings.defaultIndexLabel', {
            defaultMessage: 'Default index'
          }),
          value: '_all',
          description: i18n.translate('timelion.uiSettings.defaultIndexDescription', {
            defaultMessage: 'Default elasticsearch index to search with {esParam}',
            values: { esParam: '.es()' }
          }),
          category: ['timelion'],
        },
        'timelion:target_buckets': {
          name: i18n.translate('timelion.uiSettings.targetBucketsLabel', {
            defaultMessage: 'Target buckets'
          }),
          value: 200,
          description: i18n.translate('timelion.uiSettings.targetBucketsDescription', {
            defaultMessage: 'The number of buckets to shoot for when using auto intervals'
          }),
          category: ['timelion'],
        },
        'timelion:max_buckets': {
          name: i18n.translate('timelion.uiSettings.maximumBucketsLabel', {
            defaultMessage: 'Maximum buckets'
          }),
          value: 2000,
          description: i18n.translate('timelion.uiSettings.maximumBucketsDescription', {
            defaultMessage: 'The maximum number of buckets a single datasource can return'
          }),
          category: ['timelion'],
        },
        'timelion:default_columns': {
          name: i18n.translate('timelion.uiSettings.defaultColumnsLabel', {
            defaultMessage: 'Default columns'
          }),
          value: 2,
          description: i18n.translate('timelion.uiSettings.defaultColumnsDescription', {
            defaultMessage: 'Number of columns on a timelion sheet by default'
          }),
          category: ['timelion'],
        },
        'timelion:default_rows': {
          name: i18n.translate('timelion.uiSettings.defaultRowsLabel', {
            defaultMessage: 'Default rows'
          }),
          value: 2,
          description: i18n.translate('timelion.uiSettings.defaultRowsDescription', {
            defaultMessage: 'Number of rows on a timelion sheet by default'
          }),
          category: ['timelion'],
        },
        'timelion:min_interval': {
          name: i18n.translate('timelion.uiSettings.minimumIntervalLabel', {
            defaultMessage: 'Minimum interval'
          }),
          value: '1ms',
          description: i18n.translate('timelion.uiSettings.minimumIntervalDescription', {
            defaultMessage: 'The smallest interval that will be calculated when using "auto"',
            description: '"auto" is a technical value in that context, that should not be translated.'
          }),
          category: ['timelion'],
        },
        'timelion:graphite.url': {
          name: i18n.translate('timelion.uiSettings.graphiteURLLabel', {
            defaultMessage: 'Graphite URL'
          }),
          value: 'https://www.hostedgraphite.com/UID/ACCESS_KEY/graphite',
          description: i18n.translate('timelion.uiSettings.graphiteURLDescription', {
            defaultMessage: '{experimentalLabel} The URL of your graphite host',
            values: { experimentalLabel: `<em>[${experimentalLabel}]</em>` }
          }),
          category: ['timelion'],
        },
        'timelion:quandl.key': {
          name: i18n.translate('timelion.uiSettings.quandlKeyLabel', {
            defaultMessage: 'Quandl key'
          }),
          value: 'someKeyHere',
          description: i18n.translate('timelion.uiSettings.quandlKeyDescription', {
            defaultMessage: '{experimentalLabel} Your API key from www.quandl.com',
            values: { experimentalLabel: `<em>[${experimentalLabel}]</em>` }
          }),
          category: ['timelion'],
        }
      },
    },
    init: require('./init.js'),
  });
}
