export const FILEBEAT_ONPREM_CLOUD_INSTRUCTIONS = {
  CONFIG: {
    OSX: {
      title: 'Edit the configuration',
      textPre: 'Modify `filebeat.yml` to set the connection information:',
      commands: [
        'setup.kibana:',
        '  host: "<<kibana-host>>:5601"',
        'output.elasticsearch:',
        '  hosts: ["<es_url>:9200"]',
        '  username: "elastic"',
        '  password: "<password>"'
      ],
      textPost: 'Where `<password>` is the password of the `elastic` user.'
    },
    DEB: {
      title: 'Edit the configuration',
      textPre: 'Modify `/etc/filebeat/filebeat.yml` to set the connection information:',
      commands: [
        'setup.kibana:',
        '  host: "<<kibana-host>>:5601"',
        'output.elasticsearch:',
        '  hosts: ["<es_url>:9200"]',
        '  username: "elastic"',
        '  password: "<password>"'
      ],
      textPost: 'Where `<password>` is the password of the `elastic` user.'
    },
    RPM: {
      title: 'Edit the configuration',
      textPre: 'Modify `/etc/filebeat/filebeat.yml` to set the connection information:',
      commands: [
        'setup.kibana:',
        '  host: "<<kibana-host>>:5601"',
        'output.elasticsearch:',
        '  hosts: ["<es_url>:9200"]',
        '  username: "elastic"',
        '  password: "<password>"'
      ],
      textPost: 'Where `<password>` is the password of the `elastic` user.'
    },
    WINDOWS: {
      title: 'Edit the configuration',
      textPre: 'Modify `C:\\Program Files\\Filebeat\\filebeat.yml` to set the connection information:',
      commands: [
        'setup.kibana:',
        '  host: "<<kibana-host>>:5601"',
        'output.elasticsearch:',
        '  hosts: ["<es_url>:9200"]',
        '  username: "elastic"',
        '  password: "<password>"'
      ],
      textPost: 'Where `<password>` is the password of the `elastic` user.'
    }
  }
};
