import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';
import { FILEBEAT_INSTRUCTIONS } from '../../../common/tutorials/tutorial_beats_instructions';

export function mysqlLogsSpecProvider() {
  return {
    id: 'mysqlLogs',
    name: 'MySQL logs',
    category: TUTORIAL_CATEGORY.LOGGING,
    shortDescription: 'This module parses slow logs and error logs created by MySQL.',
    longDescription: 'This module parses slow logs and error logs created by MySQL.' +
                     ' You can read more about the Filebeat MySQL module in the [documentation].',
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
                title: 'Enable and configure the MySQL module',
                textPre: 'In the Filebeat install directory, run the following commands to enable the MySQL module.',
                commands: [
                  './filebeat modules enable mysql',
                ],
                textPost: 'Optional: Modify the module settings in the `modules.d/mysql.yml` file.'
              },
              FILEBEAT_INSTRUCTIONS.START.OSX
            ]
          },
          {
            id: INSTRUCTION_VARIANT.DEB,
            instructions: [
              FILEBEAT_INSTRUCTIONS.INSTALL.DEB,
              {
                title: 'Enable and configure the MySQL module',
                textPre: 'Run the following commands to enable the MySQL module.',
                commands: [
                  'sudo filebeat modules enable mysql',
                ],
                textPost: 'Optional: Modify the module settings in the `/etc/filebeat/modules.d/mysql.yml` file.'
              },
              FILEBEAT_INSTRUCTIONS.START.DEB
            ]
          },
          {
            id: INSTRUCTION_VARIANT.RPM,
            instructions: [
              FILEBEAT_INSTRUCTIONS.INSTALL.RPM,
              {
                title: 'Enable and configure the MySQL module',
                textPre: 'Run the following commands to enable the MySQL module.',
                commands: [
                  'sudo filebeat modules enable mysql',
                ],
                textPost: 'Optional: Modify the module settings in the `/etc/filebeat/modules.d/mysql.yml` file.'
              },
              FILEBEAT_INSTRUCTIONS.START.RPM
            ]
          },
          {
            id: INSTRUCTION_VARIANT.WINDOWS,
            instructions: [
              FILEBEAT_INSTRUCTIONS.INSTALL.WINDOWS,
              {
                title: 'Enable and configure the MySQL module',
                textPre: 'In the `C:\\Program Files\\Filebeat` folder, run the following commands to enable the MySQL module.',
                commands: [
                  'PS C:\\Program Files\\Filebeat> filebeat.exe modules enable mysql',
                ],
                textPost: 'Optional: Modify the module settings in the `modules.d/mysql.yml` file.'
              },
              FILEBEAT_INSTRUCTIONS.START.WINDOWS
            ]
          }
        ]
      }
    ]
  };
}
