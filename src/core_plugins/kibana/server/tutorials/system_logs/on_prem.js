import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';
import { FILEBEAT_INSTRUCTIONS } from '../../../common/tutorials/filebeat_instructions';

export const ON_PREM_INSTRUCTIONS = {
  instructionSets: [
    {
      title: 'Getting Started',
      instructionVariants: [
        {
          id: INSTRUCTION_VARIANT.OSX,
          instructions: [
            FILEBEAT_INSTRUCTIONS.INSTALL.OSX,
            {
              title: 'Enable and configure the system module',
              textPre: 'From the installation directory, run:',
              commands: [
                './filebeat modules enable system',
              ],
              textPost: 'Modify the settings in the `modules.d/system.yml` file.'
            },
            FILEBEAT_INSTRUCTIONS.START.OSX
          ]
        },
        {
          id: INSTRUCTION_VARIANT.DEB,
          instructions: [
            FILEBEAT_INSTRUCTIONS.INSTALL.DEB,
            {
              title: 'Enable and configure the system module',
              commands: [
                'sudo filebeat modules enable system',
              ],
              textPost: 'Modify the settings in the `/etc/filebeat/modules.d/system.yml` file.'
            },
            FILEBEAT_INSTRUCTIONS.START.DEB
          ]
        },
        {
          id: INSTRUCTION_VARIANT.RPM,
          instructions: [
            FILEBEAT_INSTRUCTIONS.INSTALL.RPM,
            {
              title: 'Enable and configure the system module',
              commands: [
                'sudo filebeat modules enable system',
              ],
              textPost: 'Modify the settings in the `/etc/filebeat/modules.d/system.yml` file.'
            },
            FILEBEAT_INSTRUCTIONS.START.RPM
          ]
        }
      ]
    }
  ]
};
