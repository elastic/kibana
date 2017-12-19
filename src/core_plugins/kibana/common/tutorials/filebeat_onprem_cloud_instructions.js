export const FILEBEAT_ONPREM_CLOUD_INSTRUCTIONS = {
  TRYCLOUD_OPTION1: {
    title: 'Option 1: Try module in Elastic Cloud',
    textPre: 'Go to [Elastic Cloud](https://cloud.elastic.co/). Register if you ' +
             'don\'t have an account.\n' +
             ' * Select **Create Cluster**, leave size slider at 4 GB RAM, and click **Create**\n' +
             ' * Wait for the cluster plan to complete.\n' +
             ' * Go to the new Cloud Kibana instance and follow the Kibana Home instructions.'

  },
  TRYCLOUD_OPTION2: {
    title: 'Option 2: Local Kibana connected to a Cloud instance',
    textPre: 'If you are running this Kibana instance against a hosted Elasticsearch instance,' +
             ' proceed with manual setup.\n' +
             ' * In **Overview >> Endpoints** note **Elasticsearch** as `<es_url>`'
  },
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
