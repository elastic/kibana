import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';

export function systemMetricsSpecProvider() {
  return {
    id: 'systemMetrics',
    name: 'System metrics',
    category: TUTORIAL_CATEGORY.METRICS,
    shortDescription: 'This module collects CPU, memory, network, and disk statistics from the host.',
    longDescription: 'This module CPU, memory, network, and disk statistics from the host.' +
                     ' It collects system wide statistics as well as per process and per filesystem statistics.' +
                     ' You can read more about the Metricbeat System module in the [documentation].',
    //iconPath: '', TODO
    completionTimeMinutes: 10,
    //previewImagePath: 'kibana-system.png', TODO
    instructionSets: [
      {
        title: 'Getting Started',
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.OSX,
            instructions: [
              {
                title: 'Download and install Metricbeat',
                textPre: 'Download and install Metricbeat by running the commands below.' +
                         ' Skip this step if you already have Metricbeat installed.' +
                         ' If you are installing Metricbeat for the first time, we recommend reading the [Getting Started]' +
                         ' guide in the online documentation.',
                commands: [
                  'curl -L -O https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-{config.kibana.version}-darwin-x86_64.tar.gz',
                  'tar xzvf metricbeat-{config.kibana.version}-darwin-x86_64.tar.gz'
                ],
                textPost: 'Edit the `metricbeat-{config.kibana.version}-darwin-x86_64/metricbeat.yml` file and ' +
                           'adjust the `output.elasticsearch` settings if needed.'
              },
              {
                title: 'Enable and configure the System module',
                textPre: 'In the Metricbeat install directory, run the following commands to enable the System module.' +
                         ' Note that the System module is enabled by default.',
                commands: [
                  './metricbeat modules enable system',
                ],
                textPost: 'Optional: Modify the module settings in the `modules.d/system.yml` file.'
              },
              {
                title: 'Start Metricbeat',
                textPre: 'Setup the Kibana dashboards and start Metricbeat with the following commands.' +
                         ' Skip this step if you already have Metricbeat installed.',
                commands: [
                  './metricbeat -e --setup',
                ],
                textPost: 'The `--setup` flag loads the Kibana dashboards. If the dashboards are already setup, ' +
                          'you don\'t need to use this flag.'
              }
            ]
          },
          {
            id: INSTRUCTION_VARIANT.DEB,
            instructions: [
              {
                title: 'Download and install Metricbeat',
                textPre: 'Download and install Metricbeat by running the commands below.' +
                         ' Skip this step if you already have Metricbeat installed.' +
                         ' If you are installing Metricbeat for the first time, we recommend reading the [Getting Started]' +
                         ' guide in the online documentation.',
                commands: [
                  'curl -L -O https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-{config.kibana.version}-amd64.deb',
                  'sudo dpkg -i metricbeat-{config.kibana.version}-amd64.deb'
                ],
                textPost: 'Edit the `/etc/metricbeat/metricbeat.yml` file and ' +
                           'adjust the `output.elasticsearch` settings if needed.'
              },
              {
                title: 'Enable and configure the System module',
                textPre: 'Run the following commands to enable the System module.' +
                         ' Note that the System module is enabled by default.',
                commands: [
                  'sudo metricbeat modules enable system',
                ],
                textPost: 'Optional: Modify the module settings in the `/etc/metricbeat/modules.d/system.yml` file.'
              },
              {
                title: 'Start Metricbeat',
                textPre: 'Setup the Kibana dashboards and start Metricbeat with the following commands.',
                commands: [
                  'sudo metricbeat setup -e',
                  'sudo service metricbeat start',
                ],
                textPost: 'The `setup` command loads the Kibana dashboards. If the dashboards are already installed, ' +
                          'you don\'t need to run it again.'
              }
            ]
          },
          {
            id: INSTRUCTION_VARIANT.RPM,
            instructions: [
              {
                title: 'Download and install Metricbeat',
                textPre: 'Download and install Metricbeat by running the commands below.' +
                         ' Skip this step if you already have Metricbeat installed.' +
                         ' If you are installing Metricbeat for the first time, we recommend reading the [Getting Started]' +
                         ' guide in the online documentation.',
                commands: [
                  'curl -L -O https://artifacts.elastic.co/downloads/beats/metricbeat/metricbeat-{config.kibana.version}-x86_64.rpm',
                  'sudo rpm -vi metricbeat-{config.kibana.version}-x86_64.rpm'
                ],
                textPost: 'Edit the `/etc/metricbeat/metricbeat.yml` file and ' +
                           'adjust the `output.elasticsearch` settings if needed.'
              },
              {
                title: 'Enable and configure the System module',
                textPre: 'Run the following commands to enable the System module.' +
                         ' Note that the System module is enabled by default.',
                commands: [
                  'sudo metricbeat modules enable system',
                ],
                textPost: 'Optional: Modify the module settings in the `/etc/metricbeat/modules.d/system.yml` file.'
              },
              {
                title: 'Start Metricbeat',
                textPre: 'Setup the Kibana dashboards and start Metricbeat with the following commands.',
                commands: [
                  'sudo metricbeat setup -e',
                  'sudo service metricbeat start',
                ],
                textPost: 'The `setup` command loads the Kibana dashboards. If the dashboards are already installed, ' +
                          'you don\'t need to run it again.'
              }
            ]
          },
          {
            id: INSTRUCTION_VARIANT.WINDOWS,
            instructions: [
              {
                title: 'Download and install Metricbeat',
                textPre: 'Skip this step if you already have Metricbeat installed.' +
                         ' If you are installing Metricbeat for the first time, we recommend reading the [Getting Started]' +
                         ' guide in the online documentation\n' +
                          '1. Download the Metricbeat Windows zip file from the [downloads](https://www.elastic.co/downloads/beats) page.\n' +
                          '2. Extract the contents of the zip file into `C:\\Program Files`.\n' +
                          '3. Rename the metricbeat-{config.kibana.version}-windows directory to Metricbeat.\n' +
                          '4. Open a PowerShell prompt as an Administrator (right-click the PowerShell icon and select' +
                          ' Run As Administrator). If you are running Windows XP, you may need to download and install PowerShell.\n' +
                          '5. From the PowerShell prompt, run the following commands to install Metricbeat as a Windows service.',
                commands: [
                  'PS > cd C:\\Program Files\\Metricbeat',
                  'PS C:\\Program Files\\Metricbeat> .\\install-service-metricbeat.ps1'
                ],
                textPost: 'Edit the `C:\\Program Files\\Metricbeat\\metricbeat.yml` file and ' +
                           'adjust the `output.elasticsearch` settings if needed.'
              },
              {
                title: 'Enable and configure the System module',
                textPre: 'In the `C:\\Program Files\\Metricbeat` folder, run the following commands to enable the System module.' +
                         ' Note that the System module is enabled by default.',
                commands: [
                  'PS C:\\Program Files\\Metricbeat> metricbeat.exe modules enable system',
                ],
                textPost: 'Optional: Modify the module settings in the `modules.d/system.yml` file.'
              },
              {
                title: 'Start Metricbeat',
                textPre: 'Setup the Kibana dashboards and start Metricbeat as a service with the following commands.',
                commands: [
                  'PS C:\\Program Files\\Metricbeat> metricbeat.exe setup -e',
                  'PS C:\\Program Files\\Metricbeat> Service-Start metricbeat',
                ],
                textPost: 'The `setup` command loads the Kibana dashboards. If the dashboards are already installed, ' +
                          'you don\'t need to run it again.'
              }
            ]
          }
        ]
      }
    ]
  };
}
