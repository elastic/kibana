import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';

export function apacheSpecProvider() {
  return {
    id: 'apache',
    name: 'Apache logs',
    category: TUTORIAL_CATEGORY.LOGGING,
    shortDescription: 'This module parses access and error logs created by the Apache HTTP server.',
    longDescription: 'This module parses access and error logs created by the Apache HTTP server.',
    //iconPath: '', TODO
    completionTimeMinutes: 10,
    previewImagePath: 'kibana-apache2.png',
    instructionSets: [
      {
        title: 'Getting Started',
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.OSX,
            instructions: [
              {
                title: 'Download and install Filebeat',
                textPre: 'Download and install Filebeat by running the commands below.',
                commands: [
                  'curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-{config.kibana.version}-darwin-x86_64.tar.gz',
                  'tar xzvf filebeat-{config.kibana.version}-darwin-x86_64.tar.gz'
                ]
              },
              {
                title: 'Enable and configure the Apache module',
                textPre: `In the Filebeat install directory, run the following commands to enable the Apache module,
                          to setup the module, and to start Filebeat.`,
                commands: [
                  'cd filebeat-{config.kibana.version}-darwin-x86_64/',
                  './filebeat modules enable apache2',
                ],
                textPost: 'Optional: Modify the module settings in the `modules.d/apache2.yml` file.'
              },
              {
                title: 'Start Filebeat',
                textPre: 'Setup the Kibana dashboards and start Filebeat with the following commands.',
                commands: [
                  './filebeat setup -e',
                  './filebeat -e',
                ],
              }
            ]
          },
          {
            id: INSTRUCTION_VARIANT.DEB,
            instructions: [
              {
                title: 'Download and install Filebeat',
                textPre: 'Download and install Filebeat by running the commands below.',
                commands: [
                  'curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-{config.kibana.version}-amd64.deb',
                  'sudo dpkg -i filebeat-{config.kibana.version}-amd64.deb'
                ]
              },
              {
                title: 'Enable and configure the Apache module',
                textPre: 'Run the following commands to enable the Apache module, to setup the module, and to start Filebeat.',
                commands: [
                  'sudo filebeat modules enable apache2',
                ],
                textPost: 'Optional: Modify the module settings in the `/etc/filebeat/modules.d/apache2.yml` file.'
              },
              {
                title: 'Start Filebeat',
                textPre: 'Setup the Kibana dashboards and start Filebeat with the following commands.',
                commands: [
                  'sudo filebeat setup -e',
                  'sudo filebeat -e',
                ],
              }
            ]
          },
          {
            id: INSTRUCTION_VARIANT.RPM,
            instructions: [
              {
                title: 'Download and install Filebeat',
                textPre: 'Download and install Filebeat by running the commands below.',
                commands: [
                  'curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-{config.kibana.version}-x86_64.rpm',
                  'sudo rpm -vi filebeat-{config.kibana.version}-x86_64.rpm'
                ]
              },
              {
                title: 'Enable and configure the Apache module',
                textPre: 'Run the following commands to enable the Apache module, to setup the module, and to start Filebeat.',
                commands: [
                  'sudo filebeat modules enable apache2',
                ],
                textPost: 'Optional: Modify the module settings in the `/etc/filebeat/modules.d/apache2.yml` file.'
              },
              {
                title: 'Start Filebeat',
                textPre: 'Setup the Kibana dashboards and start Filebeat with the following commands.',
                commands: [
                  'sudo filebeat setup -e',
                  'sudo filebeat -e',
                ],
              }
            ]
          },
          {
            id: INSTRUCTION_VARIANT.WINDOWS,
            instructions: [
              {
                title: 'Download and install Filebeat',
                textPre: `1. Download the Filebeat Windows zip file from the [downloads](https://www.elastic.co/downloads/beats) page.
                          2. Extract the contents of the zip file into C:\Program Files.
                          3. Rename the filebeat-{config.kibana.version}-windows directory to Filebeat.
                          4. Open a PowerShell prompt as an Administrator (right-click the PowerShell icon and select
                             Run As Administrator). If you are running Windows XP, you may need to download and install PowerShell.
                          5. From the PowerShell prompt, run the following commands to install Filebeat as a Windows service:`,
                commands: [
                  'PS > cd C:\\Program Files\\Filebeat',
                  'PS C:\\Program Files\\Filebeat> .\\install-service-filebeat.ps1'
                ]
              },
            ]
          }
        ]
      }
    ]
  };
}
