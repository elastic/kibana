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
            '    var.input.udp.port: <udp_port_for_receving_netflow_data>',
            '    var.elasticsearch.hosts: [ "<es_url>" ]',
            '    var.kibana.host: "<kibana_hostname>:<kibana_port>"'
          ]
        }
      ],
      WINDOWS: [
        {
          title: 'Edit the configuration',
          textPre: 'Modify `config\\logstash.yml` to set the configuration parameters:',
          commands: [
            'modules:',
            '  - name: netflow',
            '    var.input.udp.port: <udp_port_for_receving_netflow_data>',
            '    var.elasticsearch.hosts: [ "<es_url>" ]',
            '    var.kibana.host: "<kibana_hostname>:<kibana_port>"'
          ]
        }
      ]
    },
    ELASTIC_CLOUD: {
      OSX: [
        {
          title: 'Edit the configuration',
          textPre: 'Modify `config/logstash.yml` to set the configuration parameters:',
          commands: [
            'modules:',
            '  - name: netflow',
            '    var.input.udp.port: <udp_port_for_receving_netflow_data>',
            '    cloud.id: "{config.cloud.id}"',
            '    cloud.auth: "elastic:<password>"'
          ],
          textPost: 'Where `<password>` is the password of the `elastic` user.'
        }
      ],
      WINDOWS: [
        {
          title: 'Edit the configuration',
          textPre: 'Modify `config\\logstash.yml` to set the configuration parameters:',
          commands: [
            'modules:',
            '  - name: netflow',
            '    var.input.udp.port: <udp_port_for_receving_netflow_data>',
            '    cloud.id: "{config.cloud.id}"',
            '    cloud.auth: "elastic:<password>"'
          ]
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
