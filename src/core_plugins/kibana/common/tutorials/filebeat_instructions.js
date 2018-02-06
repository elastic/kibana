export const FILEBEAT_INSTRUCTIONS = {
  INSTALL: {
    OSX: {
      title: 'Download and install Filebeat',
      textPre: 'First time using Filebeat? See the [Getting Started Guide]' +
               '({config.docs.beats.filebeat}/filebeat-getting-started.html).',
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-{config.kibana.version}-darwin-x86_64.tar.gz',
        'tar xzvf filebeat-{config.kibana.version}-darwin-x86_64.tar.gz',
        'cd filebeat-{config.kibana.version}-darwin-x86_64/',
      ]
    },
    DEB: {
      title: 'Download and install Filebeat',
      textPre: 'First time using Filebeat? See the [Getting Started Guide]' +
               '({config.docs.beats.filebeat}/filebeat-getting-started.html).',
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-{config.kibana.version}-amd64.deb',
        'sudo dpkg -i filebeat-{config.kibana.version}-amd64.deb'
      ],
      textPost: 'Looking for the 32-bit packages? See the [Download page](https://www.elastic.co/downloads/beats/filebeat).'
    },
    RPM: {
      title: 'Download and install Filebeat',
      textPre: 'First time using Filebeat? See the [Getting Started Guide]' +
               '({config.docs.beats.filebeat}/filebeat-getting-started.html).',
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-{config.kibana.version}-x86_64.rpm',
        'sudo rpm -vi filebeat-{config.kibana.version}-x86_64.rpm'
      ],
      textPost: 'Looking for the 32-bit packages? See the [Download page](https://www.elastic.co/downloads/beats/filebeat).'
    },
    WINDOWS: {
      title: 'Download and install Filebeat',
      textPre: 'First time using Filebeat? See the [Getting Started Guide]' +
               '({config.docs.beats.filebeat}/filebeat-getting-started.html).\n' +
               '1. Download the Filebeat Windows zip file from the [Download](https://www.elastic.co/downloads/beats/filebeat) page.\n' +
               '2. Extract the contents of the zip file into `C:\\Program Files`.\n' +
               '3. Rename the `filebeat-{config.kibana.version}-windows` directory to `Filebeat`.\n' +
               '4. Open a PowerShell prompt as an Administrator (right-click the PowerShell icon and select' +
               ' **Run As Administrator**). If you are running Windows XP, you might need to download and install PowerShell.\n' +
               '5. From the PowerShell prompt, run the following commands to install Filebeat as a Windows service.',
      commands: [
        'PS > cd C:\\Program Files\\Filebeat',
        'PS C:\\Program Files\\Filebeat> .\\install-service-filebeat.ps1'
      ],
      textPost: 'Modify the settings under `output.elasticsearch` in the ' +
                '`C:\\Program Files\\Filebeat\\filebeat.yml` file to point to your Elasticsearch installation.'
    }
  },
  START: {
    OSX: {
      title: 'Start Filebeat',
      textPre: 'The `setup` command loads the Kibana dashboards.' +
                ' If the dashboards are already set up, omit this command.',
      commands: [
        './filebeat setup',
        './filebeat -e',
      ]
    },
    DEB: {
      title: 'Start Filebeat',
      textPre: 'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, ' +
                'omit this command.',
      commands: [
        'sudo filebeat setup',
        'sudo service filebeat start',
      ]
    },
    RPM: {
      title: 'Start Filebeat',
      textPre: 'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, ' +
                'omit this command.',
      commands: [
        'sudo filebeat setup',
        'sudo service filebeat start',
      ],
    },
    WINDOWS: {
      title: 'Start Filebeat',
      textPre: 'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, ' +
                'omit this command.',
      commands: [
        'PS C:\\Program Files\\Filebeat> filebeat.exe setup',
        'PS C:\\Program Files\\Filebeat> Start-Service filebeat',
      ]
    }
  },
  CONFIG: {
    OSX: {
      title: 'Edit the configuration',
      textPre: 'Modify `filebeat.yml` to set the connection information:',
      commands: [
        'output.elasticsearch:',
        '  hosts: ["<es_url>"]',
        '  username: "elastic"',
        '  password: "<password>"',
        'setup.kibana:',
        '  host: "<kibana_url>"'
      ],
      textPost: 'Where `<password>` is the password of the `elastic` user, ' +
                '`<es_url>` is the URL of Elasticsearch, and `<kibana_url>` is the URL of Kibana.'
    },
    DEB: {
      title: 'Edit the configuration',
      textPre: 'Modify `/etc/filebeat/filebeat.yml` to set the connection information:',
      commands: [
        'output.elasticsearch:',
        '  hosts: ["<es_url>"]',
        '  username: "elastic"',
        '  password: "<password>"',
        'setup.kibana:',
        '  host: "<kibana_url>"'
      ],
      textPost: 'Where `<password>` is the password of the `elastic` user, ' +
                '`<es_url>` is the URL of Elasticsearch, and `<kibana_url>` is the URL of Kibana.'
    },
    RPM: {
      title: 'Edit the configuration',
      textPre: 'Modify `/etc/filebeat/filebeat.yml` to set the connection information:',
      commands: [
        'output.elasticsearch:',
        '  hosts: ["<es_url>"]',
        '  username: "elastic"',
        '  password: "<password>"',
        'setup.kibana:',
        '  host: "<kibana_url>"'
      ],
      textPost: 'Where `<password>` is the password of the `elastic` user, ' +
                '`<es_url>` is the URL of Elasticsearch, and `<kibana_url>` is the URL of Kibana.'
    },
    WINDOWS: {
      title: 'Edit the configuration',
      textPre: 'Modify `C:\\Program Files\\Filebeat\\filebeat.yml` to set the connection information:',
      commands: [
        'output.elasticsearch:',
        '  hosts: ["<es_url>"]',
        '  username: "elastic"',
        '  password: "<password>"',
        'setup.kibana:',
        '  host: "<kibana_url>"'
      ],
      textPost: 'Where `<password>` is the password of the `elastic` user, ' +
                '`<es_url>` is the URL of Elasticsearch, and `<kibana_url>` is the URL of Kibana.'
    }
  },
  PLUGINS: {
    GEOIP_AND_UA: {
      title: 'Install Elasticsearch GeoIP and user agent plugins',
      textPre: 'This module requires two Elasticsearch plugins that are not ' +
               'installed by default.\n\nFrom the Elasticsearch installation folder, run:',
      commands: [
        'bin/elasticsearch-plugin install ingest-geoip',
        'bin/elasticsearch-plugin install ingest-user-agent'
      ]
    },
    GEOIP: {
      title: 'Install Elasticsearch GeoIP plugin',
      textPre: 'This module requires an Elasticsearch plugin that is not ' +
               'installed by default.\n\nFrom the Elasticsearch installation folder, run:',
      commands: [
        'bin/elasticsearch-plugin install ingest-geoip'
      ]
    }
  }
};
