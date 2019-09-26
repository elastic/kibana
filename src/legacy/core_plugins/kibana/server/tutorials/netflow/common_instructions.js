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

export function createCommonNetflowInstructions() {
  return {
    CONFIG: {
      ON_PREM: {
        OSX: [
          {
            title: i18n.translate('kbn.server.tutorials.netflow.common.config.onPrem.osxTitle', {
              defaultMessage: 'Edit the configuration',
            }),
            textPre: i18n.translate(
              'kbn.server.tutorials.netflow.common.config.onPrem.osxTextPre',
              {
                defaultMessage: 'Modify {logstashConfigPath} to set the configuration parameters:',
                values: {
                  logstashConfigPath: '`config/logstash.yml`',
                },
              }
            ),
            commands: ['modules:', '  - name: netflow', '    var.input.udp.port: <udp_port>'],
            textPost: i18n.translate(
              'kbn.server.tutorials.netflow.common.config.onPrem.osxTextPost',
              {
                defaultMessage:
                  'Where {udpPort} is the UDP port on which Logstash will receive Netflow data.',
                values: {
                  udpPort: '`<udp_port>`',
                },
              }
            ),
          },
        ],
        WINDOWS: [
          {
            title: i18n.translate(
              'kbn.server.tutorials.netflow.common.config.onPrem.windowsTitle',
              {
                defaultMessage: 'Edit the configuration',
              }
            ),
            textPre: i18n.translate(
              'kbn.server.tutorials.netflow.common.config.onPrem.windowsTextPre',
              {
                defaultMessage: 'Modify {logstashConfigPath} to set the configuration parameters:',
                values: {
                  logstashConfigPath: '`config\\logstash.yml`',
                },
              }
            ),
            commands: ['modules:', '  - name: netflow', '    var.input.udp.port: <udp_port>'],
            textPost: i18n.translate(
              'kbn.server.tutorials.netflow.common.config.onPrem.windowsTextPost',
              {
                defaultMessage:
                  'Where {udpPort} is the UDP port on which Logstash will receive Netflow data.',
                values: {
                  udpPort: '`<udp_port>`',
                },
              }
            ),
          },
        ],
      },
      ON_PREM_ELASTIC_CLOUD: {
        OSX: [
          {
            title: i18n.translate(
              'kbn.server.tutorials.netflow.common.config.onPremElasticCloud.osxTitle',
              {
                defaultMessage: 'Edit the configuration',
              }
            ),
            textPre: i18n.translate(
              'kbn.server.tutorials.netflow.common.config.onPremElasticCloud.osxTextPre',
              {
                defaultMessage: 'Modify {logstashConfigPath} to set the configuration parameters:',
                values: {
                  logstashConfigPath: '`config/logstash.yml`',
                },
              }
            ),
            commands: [
              'modules:',
              '  - name: netflow',
              '    var.input.udp.port: <udp_port>',
              '    var.elasticsearch.hosts: [ "<es_url>" ]',
              '    var.elasticsearch.username: elastic',
              '    var.elasticsearch.password: <password>',
            ],
            textPost: i18n.translate(
              'kbn.server.tutorials.netflow.common.config.onPremElasticCloud.osxTextPost',
              {
                defaultMessage:
                  'Where {udpPort} is the UDP port on which Logstash will receive Netflow data, \
  {esUrl} is the URL of Elasticsearch running on Elastic Cloud, and \
  {password} is the password of the {elastic} user.',
                values: {
                  elastic: '`elastic`',
                  esUrl: '`<es_url>`',
                  password: '`<password>`',
                  udpPort: '`<udp_port>`',
                },
              }
            ),
          },
        ],
        WINDOWS: [
          {
            title: i18n.translate(
              'kbn.server.tutorials.netflow.common.config.onPremElasticCloud.windowsTitle',
              {
                defaultMessage: 'Edit the configuration',
              }
            ),
            textPre: i18n.translate(
              'kbn.server.tutorials.netflow.common.config.onPremElasticCloud.windowsTextPre',
              {
                defaultMessage: 'Modify {logstashConfigPath} to set the configuration parameters:',
                values: {
                  logstashConfigPath: '`config\\logstash.yml`',
                },
              }
            ),
            commands: [
              'modules:',
              '  - name: netflow',
              '    var.input.udp.port: <udp_port>',
              '    var.elasticsearch.hosts: [ "<es_url>" ]',
              '    var.elasticsearch.username: elastic',
              '    var.elasticsearch.password: <password>',
            ],
            textPost: i18n.translate(
              'kbn.server.tutorials.netflow.common.config.onPremElasticCloud.windowsTextPost',
              {
                defaultMessage:
                  'Where {udpPort} is the UDP port on which Logstash will receive Netflow data, \
  {esUrl} is the URL of Elasticsearch running on Elastic Cloud, and \
  {password} is the password of the {elastic} user.',
                values: {
                  elastic: '`elastic`',
                  esUrl: '`<es_url>`',
                  password: '`<password>`',
                  udpPort: '`<udp_port>`',
                },
              }
            ),
          },
        ],
      },
      ELASTIC_CLOUD: {
        OSX: [
          {
            title: i18n.translate(
              'kbn.server.tutorials.netflow.common.config.elasticCloud.osxTitle',
              {
                defaultMessage: 'Edit the configuration',
              }
            ),
            textPre: i18n.translate(
              'kbn.server.tutorials.netflow.common.config.elasticCloud.osxTextPre',
              {
                defaultMessage: 'Modify {logstashConfigPath} to set the configuration parameters:',
                values: {
                  logstashConfigPath: '`config/logstash.yml`',
                },
              }
            ),
            commands: [
              'cloud.id: "{config.cloud.id}"',
              'cloud.auth: "elastic:<password>"',
              ' ',
              'modules:',
              '  - name: netflow',
              '    var.input.udp.port: <udp_port>',
            ],
            textPost: i18n.translate(
              'kbn.server.tutorials.netflow.common.config.elasticCloud.osxTextPost',
              {
                defaultMessage:
                  'Where {udpPort} is the UDP port on which Logstash will receive Netflow data and \
  {password} is the password of the {elastic} user.',
                values: {
                  elastic: '`elastic`',
                  password: '`<password>`',
                  udpPort: '`<udp_port>`',
                },
              }
            ),
          },
        ],
        WINDOWS: [
          {
            title: i18n.translate(
              'kbn.server.tutorials.netflow.common.config.elasticCloud.windowsTitle',
              {
                defaultMessage: 'Edit the configuration',
              }
            ),
            textPre: i18n.translate(
              'kbn.server.tutorials.netflow.common.config.elasticCloud.windowsTextPre',
              {
                defaultMessage: 'Modify {logstashConfigPath} to set the configuration parameters:',
                values: {
                  logstashConfigPath: '`config\\logstash.yml`',
                },
              }
            ),
            commands: [
              'cloud.id: "{config.cloud.id}"',
              'cloud.auth: "elastic:<password>"',
              ' ',
              'modules:',
              '  - name: netflow',
              '    var.input.udp.port: <udp_port>',
            ],
            textPost: i18n.translate(
              'kbn.server.tutorials.netflow.common.config.elasticCloud.windowsTextPost',
              {
                defaultMessage:
                  'Where {udpPort} is the UDP port on which Logstash will receive Netflow data and \
  {password} is the password of the {elastic} user.',
                values: {
                  elastic: '`elastic`',
                  password: '`<password>`',
                  udpPort: '`<udp_port>`',
                },
              }
            ),
          },
        ],
      },
    },
    SETUP: {
      OSX: [
        {
          title: i18n.translate('kbn.server.tutorials.netflow.common.setup.osxTitle', {
            defaultMessage: 'Run the Netflow module',
          }),
          textPre: i18n.translate('kbn.server.tutorials.netflow.common.setup.osxTextPre', {
            defaultMessage: 'Run:',
          }),
          commands: ['./bin/logstash --modules netflow --setup'],
          textPost: i18n.translate('kbn.server.tutorials.netflow.common.setup.osxTextPost', {
            defaultMessage:
              'The {setupOption} option creates a {netflowPrefix} index pattern in Elasticsearch and imports \
  Kibana dashboards and visualizations. Omit this option for subsequent runs to avoid overwriting existing dashboards.',
            values: {
              setupOption: '`--setup`',
              netflowPrefix: '`netflow-*`',
            },
          }),
        },
      ],
      WINDOWS: [
        {
          title: i18n.translate('kbn.server.tutorials.netflow.common.setup.windowsTitle', {
            defaultMessage: 'Run the Netflow module',
          }),
          textPre: i18n.translate('kbn.server.tutorials.netflow.common.setup.windowsTextPre', {
            defaultMessage: 'Run:',
          }),
          commands: ['bin\\logstash --modules netflow --setup'],
          textPost: i18n.translate('kbn.server.tutorials.netflow.common.setup.windowsTextPost', {
            defaultMessage:
              'The {setupOption} option creates a {netflowPrefix} index pattern in Elasticsearch and imports \
  Kibana dashboards and visualizations. Omit this option for subsequent runs to avoid overwriting existing dashboards.',
            values: {
              setupOption: '`--setup`',
              netflowPrefix: '`netflow-*`',
            },
          }),
        },
      ],
    },
  };
}
