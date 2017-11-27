export const FILEBEAT_INSTRUCTIONS = {
  INSTALL: {
    OSX: {
      title: 'Download and install Filebeat',
      textPre: 'Skip this step if Filebeat is already installed.' +
               ' First time using Filebeat? See the [Getting Started Guide]' +
               '({config.docs.beats.filebeat}/filebeat-getting-started.html).',
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-{config.kibana.version}-darwin-x86_64.tar.gz',
        'tar xzvf filebeat-{config.kibana.version}-darwin-x86_64.tar.gz',
        'cd filebeat-{config.kibana.version}-darwin-x86_64/',
      ],
      textPost: 'Modify the settings under `output.elasticsearch` in the ' +
                '`filebeat.yml` file to point to your Elasticsearch installation.'
    },
    DEB: {
      title: 'Download and install Filebeat',
      textPre: 'Skip this step if Filebeat is already installed.' +
               ' First time using Filebeat? See the [Getting Started Guide]' +
               '({config.docs.beats.filebeat}/filebeat-getting-started.html).',
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-{config.kibana.version}-amd64.deb',
        'sudo dpkg -i filebeat-{config.kibana.version}-amd64.deb'
      ],
      textPost: 'Modify the settings under `output.elasticsearch` in the ' +
                '`/etc/filebeat/filebeat.yml` file to point to your Elasticsearch installation.\n\n' +
                'Looking for the 32 bits packages? See the [Download page](https://www.elastic.co/downloads/beats/filebeat).'
    },
    RPM: {
      title: 'Download and install Filebeat',
      textPre: 'Skip this step if Filebeat is already installed.' +
               ' First time using Filebeat? See the [Getting Started Guide]' +
               '({config.docs.beats.filebeat}/filebeat-getting-started.html).',
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-{config.kibana.version}-x86_64.rpm',
        'sudo rpm -vi filebeat-{config.kibana.version}-x86_64.rpm'
      ],
      textPost: 'Modify the settings under `output.elasticsearch` in the ' +
                '`/etc/filebeat/filebeat.yml` file to point to your Elasticsearch installation.\n\n' +
                'Looking for the 32 bits packages? See the [Download page](https://www.elastic.co/downloads/beats/filebeat).'
    },
    WINDOWS: {
      title: 'Download and install Filebeat',
      textPre: 'Skip this step if Filebeat is already installed.' +
               ' First time using Filebeat? See the [Getting Started Guide]' +
               '({config.docs.beats.filebeat}/filebeat-getting-started.html).\n' +
               '1. Download the Filebeat Windows zip file from the [downloads](https://www.elastic.co/downloads/beats/filebeat) page.\n' +
               '2. Extract the contents of the zip file into `C:\\Program Files`.\n' +
               '3. Rename the `filebeat-{config.kibana.version}-windows` directory to `Filebeat`.\n' +
               '4. Open a PowerShell prompt as an Administrator (right-click the PowerShell icon and select' +
               ' Run As Administrator). If you are running Windows XP, you may need to download and install PowerShell.\n' +
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
      commands: [
        './filebeat setup -e',
        './filebeat -e',
      ],
      textPost: 'The `setup` command loads the Kibana dashboards.' +
                ' If the dashboards are already set up, omit this command.'
    },
    DEB: {
      title: 'Start Filebeat',
      commands: [
        'sudo filebeat setup -e',
        'sudo service filebeat start',
      ],
      textPost: 'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, ' +
                'omit this command.'
    },
    RPM: {
      title: 'Start Filebeat',
      commands: [
        'sudo filebeat setup -e',
        'sudo service filebeat start',
      ],
      textPost: 'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, ' +
                'omit this command.'
    },
    WINDOWS: {
      title: 'Start Filebeat',
      commands: [
        'PS C:\\Program Files\\Filebeat> filebeat.exe setup -e',
        'PS C:\\Program Files\\Filebeat> Service-Start filebeat',
      ],
      textPost: 'The `setup` command loads the Kibana dashboards. If the dashboards are already set up, ' +
                'omit this command.'
    }
  }
};
