export const FILEBEAT_INSTRUCTIONS = {
  INSTALL: {
    OSX: {
      title: 'Download and install Filebeat',
      textPre: 'Download and install Filebeat by running the commands below.' +
               ' Skip this step if you already have Filebeat installed.' +
               ' If you are installing Filebeat for the first time, we recommend reading the [Getting Started]' +
               ' guide in the online documentation.',
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-{config.kibana.version}-darwin-x86_64.tar.gz',
        'tar xzvf filebeat-{config.kibana.version}-darwin-x86_64.tar.gz'
      ],
      textPost: 'Edit the `filebeat-{config.kibana.version}-darwin-x86_64/filebeat.yml` file and ' +
                 'adjust the `output.elasticsearch` settings if needed.'
    },
    DEB: {
      title: 'Download and install Filebeat',
      textPre: 'Download and install Filebeat by running the commands below.' +
               ' Skip this step if you already have Filebeat installed.' +
               ' If you are installing Filebeat for the first time, we recommend reading the [Getting Started]' +
               ' guide in the online documentation.',
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-{config.kibana.version}-amd64.deb',
        'sudo dpkg -i filebeat-{config.kibana.version}-amd64.deb'
      ],
      textPost: 'Edit the `/etc/filebeat/filebeat.yml` file and ' +
                 'adjust the `output.elasticsearch` settings if needed.'
    },
    RPM: {
      title: 'Download and install Filebeat',
      textPre: 'Download and install Filebeat by running the commands below.' +
               ' Skip this step if you already have Filebeat installed.' +
               ' If you are installing Filebeat for the first time, we recommend reading the [Getting Started]' +
               ' guide in the online documentation.',
      commands: [
        'curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-{config.kibana.version}-x86_64.rpm',
        'sudo rpm -vi filebeat-{config.kibana.version}-x86_64.rpm'
      ],
      textPost: 'Edit the `/etc/filebeat/filebeat.yml` file and ' +
                 'adjust the `output.elasticsearch` settings if needed.'
    },
    WINDOWS: {
      title: 'Download and install Filebeat',
      textPre: 'Skip this step if you already have Filebeat installed.' +
               ' If you are installing Filebeat for the first time, we recommend reading the [Getting Started]' +
               ' guide in the online documentation\n' +
                '1. Download the Filebeat Windows zip file from the [downloads](https://www.elastic.co/downloads/beats) page.\n' +
                '2. Extract the contents of the zip file into `C:\\Program Files`.\n' +
                '3. Rename the filebeat-{config.kibana.version}-windows directory to Filebeat.\n' +
                '4. Open a PowerShell prompt as an Administrator (right-click the PowerShell icon and select' +
                ' Run As Administrator). If you are running Windows XP, you may need to download and install PowerShell.\n' +
                '5. From the PowerShell prompt, run the following commands to install Filebeat as a Windows service.',
      commands: [
        'PS > cd C:\\Program Files\\Filebeat',
        'PS C:\\Program Files\\Filebeat> .\\install-service-filebeat.ps1'
      ],
      textPost: 'Edit the `C:\\Program Files\\Filebeat\\filebeat.yml` file and ' +
                 'adjust the `output.elasticsearch` settings if needed.'
    }
  },
  START: {
    OSX: {
      title: 'Start Filebeat',
      textPre: 'Setup the Kibana dashboards and start Filebeat with the following commands.' +
               ' Skip this step if you already have Filebeat installed.',
      commands: [
        './filebeat -e --setup',
      ],
      textPost: 'The `--setup` flag loads the Kibana dashboards. If the dashboards are already setup, ' +
                'you don\'t need to use this flag.'
    },
    DEB: {
      title: 'Start Filebeat',
      textPre: 'Setup the Kibana dashboards and start Filebeat with the following commands.',
      commands: [
        'sudo filebeat setup -e',
        'sudo service filebeat start',
      ],
      textPost: 'The `setup` command loads the Kibana dashboards. If the dashboards are already installed, ' +
                'you don\'t need to run it again.'
    },
    RPM: {
      title: 'Start Filebeat',
      textPre: 'Setup the Kibana dashboards and start Filebeat with the following commands.',
      commands: [
        'sudo filebeat setup -e',
        'sudo service filebeat start',
      ],
      textPost: 'The `setup` command loads the Kibana dashboards. If the dashboards are already installed, ' +
                'you don\'t need to run it again.'
    },
    WINDOWS: {
      title: 'Start Filebeat',
      textPre: 'Setup the Kibana dashboards and start Filebeat as a service with the following commands.',
      commands: [
        'PS C:\\Program Files\\Filebeat> filebeat.exe setup -e',
        'PS C:\\Program Files\\Filebeat> Service-Start filebeat',
      ],
      textPost: 'The `setup` command loads the Kibana dashboards. If the dashboards are already installed, ' +
                'you don\'t need to run it again.'
    }
  }
};
