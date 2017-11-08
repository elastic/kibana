import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';
import { FILEBEAT_INSTRUCTIONS } from '../../../common/tutorials/tutorial_beats_instructions';

export function systemLogsSpecProvider() {
  return {
    id: 'systemLogs',
    name: 'System logs',
    category: TUTORIAL_CATEGORY.LOGGING,
    shortDescription: 'This module parses logs written by the local Syslog server.',
    longDescription: 'This module collects and parses logs created by the system logging service of common' +
                     ' Unix/Linux based distributions. This module is not available on Windows.' +
                     ' You can read more about the Filebeat System module in the [documentation].',
    //iconPath: '', TODO
    completionTimeMinutes: 10,
    //previewImagePath: '', TODO
    instructionSets: [
      {
        title: 'Getting Started',
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.OSX,
            instructions: [
              FILEBEAT_INSTRUCTIONS.INSTALL.OSX,
              {
                title: 'Enable and configure the System module',
                textPre: 'In the Filebeat install directory, run the following commands to enable the System module.',
                commands: [
                  './filebeat modules enable system',
                ],
                textPost: 'Optional: Modify the module settings in the `modules.d/system.yml` file.'
              },
              FILEBEAT_INSTRUCTIONS.START.OSX
            ]
          },
          {
            id: INSTRUCTION_VARIANT.DEB,
            instructions: [
              FILEBEAT_INSTRUCTIONS.INSTALL.DEB,
              {
                title: 'Enable and configure the System module',
                textPre: 'Run the following commands to enable the System module.',
                commands: [
                  'sudo filebeat modules enable system',
                ],
                textPost: 'Optional: Modify the module settings in the `/etc/filebeat/modules.d/system.yml` file.'
              },
              FILEBEAT_INSTRUCTIONS.START.DEB
            ]
          },
          {
            id: INSTRUCTION_VARIANT.RPM,
            instructions: [
              FILEBEAT_INSTRUCTIONS.INSTALL.RPM,
              {
                title: 'Enable and configure the System module',
                textPre: 'Run the following commands to enable the System module.',
                commands: [
                  'sudo filebeat modules enable system',
                ],
                textPost: 'Optional: Modify the module settings in the `/etc/filebeat/modules.d/system.yml` file.'
              },
              FILEBEAT_INSTRUCTIONS.START.RPM
            ]
          }
        ]
      }
    ]
  };
}
