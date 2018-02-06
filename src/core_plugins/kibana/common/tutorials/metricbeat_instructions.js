export const METRICBEAT_INSTRUCTIONS = {
  INSTALL: {
    OSX: {
      title: 'Download and install Metricbeat',
      textPre: 'First time using Metricbeat? See the [Getting Started Guide]' +
               '({config.docs.beats.metricbeat}/metricbeat-getting-started.html).',
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-{config.kibana.version}-darwin-x86_64.tar.gz',
        'tar xzvf metricbeat-{config.kibana.version}-darwin-x86_64.tar.gz',
        'cd metricbeat-{config.kibana.version}-darwin-x86_64/',
      ]
    },
    DEB: {
      title: 'Download and install Metricbeat',
      textPre: 'First time using Metricbeat? See the [Getting Started Guide]' +
               '({config.docs.beats.metricbeat}/metricbeat-getting-started.html).',
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-{config.kibana.version}-amd64.deb',
        'sudo dpkg -i metricbeat-{config.kibana.version}-amd64.deb'
      ],
      textPost: 'Looking for the 32-bit packages? See the [Download page](https://www.elastic.co/downloads/beats/metricbeat).'
    },
    RPM: {
      title: 'Download and install Metricbeat',
      textPre: 'First time using Metricbeat? See the [Getting Started Guide]' +
               '({config.docs.beats.metricbeat}/metricbeat-getting-started.html).',
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-{config.kibana.version}-x86_64.rpm',
        'sudo rpm -vi metricbeat-{config.kibana.version}-x86_64.rpm'
      ],
      textPost: 'Looking for the 32-bit packages? See the [Download page](https://www.elastic.co/downloads/beats/metricbeat).'
    },
    WINDOWS: {
      title: 'Download and install Metricbeat',
      textPre: 'First time using Metricbeat? See the [Getting Started Guide]' +
               '({config.docs.beats.metricbeat}/metricbeat-getting-started.html).\n' +
               '1. Download the Metricbeat Windows zip file from the [Download](https://www.elastic.co/downloads/beats/metricbeat) page.\n' +
               '2. Extract the contents of the zip file into `C:\\Program Files`.\n' +
               '3. Rename the `metricbeat-{config.kibana.version}-windows` directory to `Metricbeat`.\n' +
               '4. Open a PowerShell prompt as an Administrator (right-click the PowerShell icon and select' +
               ' **Run As Administrator**). If you are running Windows XP, you might need to download and install PowerShell.\n' +
               '5. From the PowerShell prompt, run the following commands to install Metricbeat as a Windows service.',
      commands: [
        'PS > cd C:\\Program Files\\Metricbeat',
        'PS C:\\Program Files\\Metricbeat> .\\install-service-metricbeat.ps1'
      ],
      textPost: 'Modify the settings under `output.elasticsearch` in the ' +
                '`C:\\Program Files\\Metricbeat\\metricbeat.yml` file to point to your Elasticsearch installation.'
    }
  },
  START: {
    OSX: {
      title: 'Start Metricbeat',
      textPre: 'The `setup` command loads the Kibana dashboards.' +
                ' If the dashboards are already set up, omit this command.',
      commands: [
        './metricbeat setup',
        './metricbeat -e',
      ]
    },
    DEB: {
      title: 'Start Metricbeat',
      textPre: 'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, ' +
                'omit this command.',
      commands: [
        'sudo metricbeat setup',
        'sudo service metricbeat start',
      ]
    },
    RPM: {
      title: 'Start Metricbeat',
      textPre: 'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, ' +
                'omit this command.',
      commands: [
        'sudo metricbeat setup',
        'sudo service metricbeat start',
      ],
    },
    WINDOWS: {
      title: 'Start Metricbeat',
      textPre: 'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, ' +
                'omit this command.',
      commands: [
        'PS C:\\Program Files\\Metricbeat> metricbeat.exe setup',
        'PS C:\\Program Files\\Metricbeat> Start-Service metricbeat',
      ]
    }
  },
  CONFIG: {
    OSX: {
      title: 'Edit the configuration',
      textPre: 'Modify `metricbeat.yml` to set the connection information:',
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
      textPre: 'Modify `/etc/metricbeat/metricbeat.yml` to set the connection information:',
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
      textPre: 'Modify `/etc/metricbeat/metricbeat.yml` to set the connection information:',
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
      textPre: 'Modify `C:\\Program Files\\Metricbeat\\metricbeat.yml` to set the connection information:',
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
  }
};
