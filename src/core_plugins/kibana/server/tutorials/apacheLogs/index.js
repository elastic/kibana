import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';
import { FILEBEAT_INSTRUCTIONS } from '../../../common/tutorials/tutorial_beats_instructions';

export function apacheLogsSpecProvider() {
  return {
    id: 'apacheLogs',
    name: 'Apache logs',
    category: TUTORIAL_CATEGORY.LOGGING,
    shortDescription: 'This module parses access and error logs created by the Apache HTTP server.',
    longDescription: 'This module parses access and error logs created by the Apache 2 HTTP server.' +
                     ' You can read more about the Filebeat Apache module in the [documentation].',
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
              FILEBEAT_INSTRUCTIONS.INSTALL.OSX,
              {
                title: 'Enable and configure the Apache module',
                textPre: 'In the Filebeat install directory, run the following commands to enable the Apache module.',
                commands: [
                  './filebeat modules enable apache2',
                ],
                textPost: 'Optional: Modify the module settings in the `modules.d/apache2.yml` file.'
              },
              FILEBEAT_INSTRUCTIONS.START.OSX
            ]
          },
          {
            id: INSTRUCTION_VARIANT.DEB,
            instructions: [
              FILEBEAT_INSTRUCTIONS.INSTALL.DEB,
              {
                title: 'Enable and configure the Apache module',
                textPre: 'Run the following commands to enable the Apache module.',
                commands: [
                  'sudo filebeat modules enable apache2',
                ],
                textPost: 'Optional: Modify the module settings in the `/etc/filebeat/modules.d/apache2.yml` file.'
              },
              FILEBEAT_INSTRUCTIONS.START.DEB
            ]
          },
          {
            id: INSTRUCTION_VARIANT.RPM,
            instructions: [
              FILEBEAT_INSTRUCTIONS.INSTALL.RPM,
              {
                title: 'Enable and configure the Apache module',
                textPre: 'Run the following commands to enable the Apache module.',
                commands: [
                  'sudo filebeat modules enable apache2',
                ],
                textPost: 'Optional: Modify the module settings in the `/etc/filebeat/modules.d/apache2.yml` file.'
              },
              FILEBEAT_INSTRUCTIONS.START.RPM
            ]
          },
          {
            id: INSTRUCTION_VARIANT.WINDOWS,
            instructions: [
              FILEBEAT_INSTRUCTIONS.INSTALL.WINDOWS,
              {
                title: 'Enable and configure the Apache module',
                textPre: 'In the `C:\\Program Files\\Filebeat` folder, run the following commands to enable the Apache module.',
                commands: [
                  'PS C:\\Program Files\\Filebeat> filebeat.exe modules enable apache2',
                ],
                textPost: 'Optional: Modify the module settings in the `modules.d/apache2.yml` file.'
              },
              FILEBEAT_INSTRUCTIONS.START.WINDOWS
            ]
          }
        ]
      }
    ]
  };
}
