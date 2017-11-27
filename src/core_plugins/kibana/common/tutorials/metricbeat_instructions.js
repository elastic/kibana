export const METRICBEAT_INSTRUCTIONS = {
  INSTALL: {
    OSX: {
      title: 'Download and install Metricbeat',
      textPre: 'Skip this step if Metricbeat is already installed.' +
               ' First time using Metricbeat? See the [Getting Started Guide]' +
               '({config.docs.beats.metricbeat}/metricbeat-getting-started.html).',
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-{config.kibana.version}-darwin-x86_64.tar.gz',
        'tar xzvf metricbeat-{config.kibana.version}-darwin-x86_64.tar.gz',
        'cd metricbeat-{config.kibana.version}-darwin-x86_64/',
      ],
      textPost: 'Modify the settings under `output.elasticsearch` in the ' +
                '`metricbeat.yml` file to point to your Elasticsearch installation.'
    },
    DEB: {
      title: 'Download and install Metricbeat',
      textPre: 'Skip this step if Metricbeat is already installed.' +
               ' First time using Metricbeat? See the [Getting Started Guide]' +
               '({config.docs.beats.metricbeat}/metricbeat-getting-started.html).',
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-{config.kibana.version}-amd64.deb',
        'sudo dpkg -i metricbeat-{config.kibana.version}-amd64.deb'
      ],
      textPost: 'Edit the `/etc/metricbeat/metricbeat.yml` file and ' +
                 'adjust the `output.elasticsearch` settings if needed.'
    },
    RPM: {
      title: 'Download and install Metricbeat',
      textPre: 'Skip this step if Metricbeat is already installed.' +
               ' First time using Metricbeat? See the [Getting Started Guide]' +
               '({config.docs.beats.metricbeat}/metricbeat-getting-started.html).',
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-{config.kibana.version}-x86_64.rpm',
        'sudo rpm -vi metricbeat-{config.kibana.version}-x86_64.rpm'
      ],
      textPost: 'Edit the `/etc/metricbeat/metricbeat.yml` file and ' +
                 'adjust the `output.elasticsearch` settings if needed.'
    },
    WINDOWS: {
      title: 'Download and install Metricbeat',
      textPre: 'Skip this step if Metricbeat is already installed.' +
               ' First time using Metricbeat? See the [Getting Started Guide]' +
               '({config.docs.beats.metricbeat}/metricbeat-getting-started.html).\n' +
               '1. Download the Metricbeat Windows zip file from the [downloads](https://www.elastic.co/downloads/beats/metricbeat) page.\n' +
               '2. Extract the contents of the zip file into `C:\\Program Files`.\n' +
               '3. Rename the `metricbeat-{config.kibana.version}-windows` directory to `Metricbeat`.\n' +
               '4. Open a PowerShell prompt as an Administrator (right-click the PowerShell icon and select' +
               ' Run As Administrator). If you are running Windows XP, you may need to download and install PowerShell.\n' +
               '5. From the PowerShell prompt, run the following commands to install Metricbeat as a Windows service.',
      commands: [
        'PS > cd C:\\Program Files\\Metricbeat',
        'PS C:\\Program Files\\Metricbeat> .\\install-service-metricbeat.ps1'
      ],
      textPost: 'Edit the `C:\\Program Files\\Metricbeat\\metricbeat.yml` file and ' +
                 'adjust the `output.elasticsearch` settings if needed.'
    }
  },
  START: {
    OSX: {
      title: 'Start Metricbeat',
      commands: [
        './metricbeat setup -e',
        './metricbeat -e --setup',
      ],
      textPost: 'The `setup` command loads the Kibana dashboards.' +
                ' If the dashboards are already set up, omit this command.'
    },
    DEB: {
      title: 'Start Metricbeat',
      commands: [
        'sudo metricbeat setup -e',
        'sudo service metricbeat start',
      ],
      textPost: 'The `setup` command loads the Kibana dashboards. If the dashboards are already installed, ' +
                'omit this command.'
    },
    RPM: {
      title: 'Start Metricbeat',
      commands: [
        'sudo metricbeat setup -e',
        'sudo service metricbeat start',
      ],
      textPost: 'The `setup` command loads the Kibana dashboards. If the dashboards are already installed, ' +
                'omit this command.'
    },
    WINDOWS: {
      title: 'Start Metricbeat',
      commands: [
        'PS C:\\Program Files\\Metricbeat> metricbeat.exe setup -e',
        'PS C:\\Program Files\\Metricbeat> Service-Start metricbeat',
      ],
      textPost: 'The `setup` command loads the Kibana dashboards. If the dashboards are already installed, ' +
                'omit this command.'
    }
  }
};
