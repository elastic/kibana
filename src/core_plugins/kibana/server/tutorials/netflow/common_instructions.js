export const COMMON_NETFLOW_INSTRUCTIONS = {
  CONFIG: {
    ON_PREM: {
      OSX: [
        {
          title: 'Edit the configuration',
          textPre: 'In the Logstash installation directory, modify `config/logstash.yml` to set the'
            + ' configuration parameters for the Netflow module.',
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
          textPre: 'While in the Logstash install directory, modify `config\\logstash.yml` to set the'
            + ' configuration parameters for the Netflow module:',
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
          textPre: 'In the Logstash installation directory, modify `config/logstash.yml` to set the'
            + ' configuration parameters for the Netflow module.',
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
          textPre: 'While in the Logstash install directory, modify `config\\logstash.yml` to set the'
            + ' configuration parameters for the Netflow module:',
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
        textPre: 'In the Logstash installation directory, run the following command to set up the Netflow module.',
        commands: [
          './bin/logstash --modules netflow --setup',
        ],
        textPost: 'The `--setup` option creates a `netflow-*` index pattern in Elasticsearch and imports' +
          ' Kibana dashboards and visualizations. Omit this option for subsequent runs of the module to avoid' +
          '  overwriting existing Kibana dashboards.'
      }
    ],
    WINDOWS: [
      {
        title: 'Set up and run the Netflow module',
        textPre: 'In the Logstash install directory, run the following command to set up the Netflow module.',
        commands: [
          'bin\\logstash --modules netflow --setup',
        ],
        textPost: 'The `--setup` option creates a `netflow-*` index pattern in Elasticsearch and imports' +
          ' Kibana dashboards and visualizations. Omit this option for subsequent runs of the module to avoid' +
          '  overwriting existing Kibana dashboards.'
      }
    ]
  }
};
