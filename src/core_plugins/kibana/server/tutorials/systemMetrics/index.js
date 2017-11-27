import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';
import { METRICBEAT_INSTRUCTIONS } from '../../../common/tutorials/metricbeat_instructions';

export function systemMetricsSpecProvider() {
  return {
    id: 'systemMetrics',
    name: 'System metrics',
    category: TUTORIAL_CATEGORY.METRICS,
    shortDescription: 'Collects CPU, memory, network, and disk statistics from the host.',
    longDescription: 'The system Metricbeat module collects CPU, memory, network, and disk statistics from the host.' +
                     ' It collects system wide statistics as well as per process and per filesystem statistics.' +
                     ' [Learn more]({config.docs.beats.metricbeat}/metricbeat-module-system.html)' +
                     ' about the system module.',
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
              METRICBEAT_INSTRUCTIONS.INSTALL.OSX,
              {
                title: 'Enable and configure the system module',
                textPre: 'From the installation directory, run:',
                commands: [
                  './metricbeat modules enable system',
                ],
                textPost: 'Modify the settings in the `modules.d/system.yml` file.'
              },
              {
                title: 'Optional: Test the module',
                textPre: 'You can do a dry-run fetch by running the following command.',
                commands: [
                  './metricbeat test modules system'
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
                title: 'Enable and configure the system module',
                commands: [
                  'sudo metricbeat modules enable system',
                ],
                textPost: 'Modify the settings in the `/etc/filebeat/modules.d/system.yml` file.'
              },
              {
                title: 'Optional: Test the module',
                textPre: 'You can do a dry-run fetch by running the following command.',
                commands: [
                  'sudo metricbeat test modules system'
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
                title: 'Enable and configure the system module',
                commands: [
                  'sudo metricbeat modules enable system',
                ],
                textPost: 'Modify the settings in the `/etc/filebeat/modules.d/system.yml` file.'
              },
              {
                title: 'Optional: Test the module',
                textPre: 'You can do a dry-run fetch by running the following command.',
                commands: [
                  'sudo metricbeat test modules system'
                ]
              },
              METRICBEAT_INSTRUCTIONS.START.RPM
            ]
          }
        ]
      }
    ]
  };
}
