import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';
import { METRICBEAT_INSTRUCTIONS } from '../../../common/tutorials/metricbeat_instructions';

export const ON_PREM_INSTRUCTIONS = {
  instructionSets: [
    {
      title: 'Getting Started',
      instructionVariants: [
        {
          id: INSTRUCTION_VARIANT.OSX,
          instructions: [
            METRICBEAT_INSTRUCTIONS.INSTALL.OSX,
            {
              title: 'Enable and configure the mysql module',
              textPre: 'From the installation directory, run:',
              commands: [
                './metricbeat modules enable mysql',
              ],
              textPost: 'Modify the settings in the `modules.d/mysql.yml` file.'
            },
            {
              title: 'Optional: Test the module',
              textPre: 'You can do a dry-run fetch by running the following command.',
              commands: [
                './metricbeat test modules mysql'
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
              title: 'Enable and configure the mysql module',
              commands: [
                'sudo metricbeat modules enable mysql',
              ],
              textPost: 'Modify the settings in the `/etc/filebeat/modules.d/mysql.yml` file.'
            },
            {
              title: 'Optional: Test the module',
              textPre: 'You can do a dry-run fetch by running the following command.',
              commands: [
                'sudo metricbeat test modules mysql'
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
              title: 'Enable and configure the mysql module',
              commands: [
                'sudo metricbeat modules enable mysql',
              ],
              textPost: 'Modify the settings in the `/etc/filebeat/modules.d/mysql.yml` file.'
            },
            {
              title: 'Optional: Test the module',
              textPre: 'You can do a dry-run fetch by running the following command.',
              commands: [
                'sudo metricbeat test modules mysql'
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
              title: 'Enable and configure the mysql module',
              textPre: 'From the `C:\\Program Files\\Filebeat` folder, run:',
              commands: [
                'PS C:\\Program Files\\Metricbeat> metricbeat.exe modules enable mysql',
              ],
              textPost: 'Modify the settings in the `modules.d/mysql.yml` file.'
            },
            {
              title: 'Optional: Test the module',
              textPre: 'You can do a dry-run fetch by running the following command.',
              commands: [
                'PS C:\\Program Files\\Metricbeat> metricbeat.exe test modules mysql'
              ]
            },
            METRICBEAT_INSTRUCTIONS.START.WINDOWS,
          ]
        }
      ]
    }
  ]
};
