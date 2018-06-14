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

export const COMMON_NETFLOW_INSTRUCTIONS = {
  CONFIG: {
    ON_PREM: {
      OSX: [
        {
          title: 'Edit the configuration',
          textPre: 'Modify `config/logstash.yml` to set the configuration parameters:',
          commands: [
            'modules:',
            '  - name: netflow',
            '    var.input.udp.port: <udp_port>',
          ],
          textPost: 'Where `<udp_port>` is the UDP port on which Logstash will receive Netflow data.'

        }
      ],
      WINDOWS: [
        {
          title: 'Edit the configuration',
          textPre: 'Modify `config\\logstash.yml` to set the configuration parameters:',
          commands: [
            'modules:',
            '  - name: netflow',
            '    var.input.udp.port: <udp_port>',
          ],
          textPost: 'Where `<udp_port>` is the UDP port on which Logstash will receive Netflow data.'
        }
      ]
    },
    ON_PREM_ELASTIC_CLOUD: {
      OSX: [
        {
          title: 'Edit the configuration',
          textPre: 'Modify `config/logstash.yml` to set the configuration parameters:',
          commands: [
            'modules:',
            '  - name: netflow',
            '    var.input.udp.port: <udp_port>',
            '    var.elasticsearch.hosts: [ "<es_url>" ]',
            '    var.elasticsearch.username: elastic',
            '    var.elasticsearch.password: <password>',
          ],
          textPost: 'Where `<udp_port>` is the UDP port on which Logstash will receive Netflow data, '
                  + '`<es_url>` is the URL of Elasticsearch running on Elastic Cloud, and '
                  + '`<password>` is the password of the `elastic` user.'
        }
      ],
      WINDOWS: [
        {
          title: 'Edit the configuration',
          textPre: 'Modify `config\\logstash.yml` to set the configuration parameters:',
          commands: [
            'modules:',
            '  - name: netflow',
            '    var.input.udp.port: <udp_port>',
            '    var.elasticsearch.hosts: [ "<es_url>" ]',
            '    var.elasticsearch.username: elastic',
            '    var.elasticsearch.password: <password>',
          ],
          textPost: 'Where `<udp_port>` is the UDP port on which Logstash will receive Netflow data, '
                  + '`<es_url>` is the URL of Elasticsearch running on Elastic Cloud, and '
                  + '`<password>` is the password of the `elastic` user.'

        }
      ]
    },
    ELASTIC_CLOUD: {
      OSX: [
        {
          title: 'Edit the configuration',
          textPre: 'Modify `config/logstash.yml` to set the configuration parameters:',
          commands: [
            'cloud.id: "{config.cloud.id}"',
            'cloud.auth: "elastic:<password>"',
            ' ',
            'modules:',
            '  - name: netflow',
            '    var.input.udp.port: <udp_port>',
          ],
          textPost: 'Where `<udp_port>` is the UDP port on which Logstash will receive Netflow data and '
                  + '`<password>` is the password of the `elastic` user.'
        }
      ],
      WINDOWS: [
        {
          title: 'Edit the configuration',
          textPre: 'Modify `config\\logstash.yml` to set the configuration parameters:',
          commands: [
            'cloud.id: "{config.cloud.id}"',
            'cloud.auth: "elastic:<password>"',
            ' ',
            'modules:',
            '  - name: netflow',
            '    var.input.udp.port: <udp_port>',
          ],
          textPost: 'Where `<udp_port>` is the UDP port on which Logstash will receive Netflow data and '
                  + '`<password>` is the password of the `elastic` user.'
        }
      ]
    }
  },
  SETUP: {
    OSX: [
      {
        title: 'Run the Netflow module',
        textPre: 'Run:',
        commands: [
          './bin/logstash --modules netflow --setup',
        ],
        textPost: 'The `--setup` option creates a `netflow-*` index pattern in Elasticsearch and imports' +
          ' Kibana dashboards and visualizations. Omit this option for subsequent runs to avoid overwriting existing dashboards.'
      }
    ],
    WINDOWS: [
      {
        title: 'Run the Netflow module',
        textPre: 'Run:',
        commands: [
          'bin\\logstash --modules netflow --setup',
        ],
        textPost: 'The `--setup` option creates a `netflow-*` index pattern in Elasticsearch and imports' +
          ' Kibana dashboards and visualizations. Omit this option for subsequent runs to avoid overwriting existing dashboards.'
      }
    ]
  }
};
