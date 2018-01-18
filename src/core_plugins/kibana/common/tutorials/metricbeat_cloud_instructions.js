export const METRICBEAT_CLOUD_INSTRUCTIONS = {
  CONFIG: {
    OSX: {
      title: 'Edit the configuration',
      textPre: 'Modify `metricbeat.yml` to set the connection information for Elastic Cloud:',
      commands: [
        'cloud.id: "{config.cloud.id}"',
        'cloud.auth: "elastic:<password>"'
      ],
      textPost: 'Where `<password>` is the password of the `elastic` user.'
    },
    DEB: {
      title: 'Edit the configuration',
      textPre: 'Modify `/etc/metricbeat/metricbeat.yml` to set the connection information for Elastic Cloud:',
      commands: [
        'cloud.id: "{config.cloud.id}"',
        'cloud.auth: "elastic:<password>"'
      ],
      textPost: 'Where `<password>` is the password of the `elastic` user.'
    },
    RPM: {
      title: 'Edit the configuration',
      textPre: 'Modify `/etc/metricbeat/metricbeat.yml` to set the connection information for Elastic Cloud:',
      commands: [
        'cloud.id: "{config.cloud.id}"',
        'cloud.auth: "elastic:<password>"'
      ],
      textPost: 'Where `<password>` is the password of the `elastic` user.'
    },
    WINDOWS: {
      title: 'Edit the configuration',
      textPre: 'Modify `C:\\Program Files\\Filebeat\\metricbeat.yml` to set the connection information for Elastic Cloud:',
      commands: [
        'cloud.id: "{config.cloud.id}"',
        'cloud.auth: "elastic:<password>"'
      ],
      textPost: 'Where `<password>` is the password of the `elastic` user.'
    }
  }
};
