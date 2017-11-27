import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';
import { METRICBEAT_INSTRUCTIONS } from '../../../common/tutorials/metricbeat_instructions';

export function apacheMetricsSpecProvider() {
  return {
    id: 'apacheMetrics',
    name: 'Apache metrics',
    category: TUTORIAL_CATEGORY.METRICS,
    shortDescription: 'Fetches internal metrics from the Apache 2 HTTP server.',
    longDescription: 'The apache Metricbeat module fetches internal metrics from the Apache 2 HTTP server.' +
                     ' [Learn more]({config.docs.beats.metricbeat}/metricbeat-module-apache.html)' +
                     ' about the apache module.',
    //iconPath: '', TODO
    completionTimeMinutes: 10,
    //previewImagePath: 'kibana-apache.png', TODO
    instructionSets: [
      {
        title: 'Getting Started',
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.OSX,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.OSX,
              {
                title: 'Enable and configure the apache module',
                textPre: 'From the installation directory, run:',
                commands: [
                  './metricbeat modules enable apache',
                ],
                textPost: 'Modify the settings in the `modules.d/apache.yml` file.'
              },
              {
                title: 'Optional: Test the module',
                textPre: 'You can do a dry-run fetch by running the following command.',
                commands: [
                  './metricbeat test modules apache'
                ]
              },
              METRICBEAT_INSTRUCTIONS.START.OSX
            ]
          },
          {
            id: INSTRUCTION_VARIANT.DEB,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.DEB,
              {
                title: 'Enable and configure the apache module',
                commands: [
                  'sudo metricbeat modules enable apache',
                ],
                textPost: 'Modify the settings in the `/etc/filebeat/modules.d/apache.yml` file.'
              },
              {
                title: 'Optional: Test the module',
                textPre: 'You can do a dry-run fetch by running the following command.',
                commands: [
                  'sudo metricbeat test modules apache'
                ]
              },
              METRICBEAT_INSTRUCTIONS.START.DEB
            ]
          },
          {
            id: INSTRUCTION_VARIANT.RPM,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.RPM,
              {
                title: 'Enable and configure the apache module',
                commands: [
                  'sudo metricbeat modules enable apache',
                ],
                textPost: 'Modify the settings in the `/etc/filebeat/modules.d/apache.yml` file.'
              },
              {
                title: 'Optional: Test the module',
                textPre: 'You can do a dry-run fetch by running the following command.',
                commands: [
                  'sudo metricbeat test modules apache'
                ]
              },
              METRICBEAT_INSTRUCTIONS.START.RPM
            ]
          },
          {
            id: INSTRUCTION_VARIANT.WINDOWS,
            instructions: [
              METRICBEAT_INSTRUCTIONS.INSTALL.WINDOWS,
              {
                title: 'Enable and configure the apache module',
                textPre: 'From the `C:\\Program Files\\Filebeat` folder, run:',
                commands: [
                  'PS C:\\Program Files\\Metricbeat> metricbeat.exe modules enable apache',
                ],
                textPost: 'Modify the settings in the `modules.d/apache.yml` file.'
              },
              {
                title: 'Optional: Test the module',
                textPre: 'You can do a dry-run fetch by running the following command.',
                commands: [
                  'PS C:\\Program Files\\Metricbeat> metricbeat.exe test modules apache'
                ]
              },
              METRICBEAT_INSTRUCTIONS.START.WINDOWS,
            ]
          }
        ]
      }
    ]
  };
}
