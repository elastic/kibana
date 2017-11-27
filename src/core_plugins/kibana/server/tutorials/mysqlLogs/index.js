import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';
import { FILEBEAT_INSTRUCTIONS } from '../../../common/tutorials/filebeat_instructions';

export function mysqlLogsSpecProvider() {
  return {
    id: 'mysqlLogs',
    name: 'MySQL logs',
    category: TUTORIAL_CATEGORY.LOGGING,
    shortDescription: 'Collect and parse error and slow logs created by MySQL.',
    longDescription: 'The mysql Filebeat module parses error and slow logs created by MySQL.' +
                     ' [Learn more]({config.docs.beats.filebeat}/filebeat-module-mysql.html)' +
                     ' about the mysql module.',
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
                title: 'Enable and configure the mysql module',
                textPre: 'From the installation directory, run:',
                commands: [
                  './filebeat modules enable mysql',
                ],
                textPost: 'Modify the settings in the `modules.d/mysql.yml` file.'
              },
              FILEBEAT_INSTRUCTIONS.START.OSX
            ]
          },
          {
            id: INSTRUCTION_VARIANT.DEB,
            instructions: [
              FILEBEAT_INSTRUCTIONS.INSTALL.DEB,
              {
                title: 'Enable and configure the mysql module',
                commands: [
                  'sudo filebeat modules enable mysql',
                ],
                textPost: 'Modify the settings in the `/etc/filebeat/modules.d/mysql.yml` file.'
              },
              FILEBEAT_INSTRUCTIONS.START.DEB
            ]
          },
          {
            id: INSTRUCTION_VARIANT.RPM,
            instructions: [
              FILEBEAT_INSTRUCTIONS.INSTALL.RPM,
              {
                title: 'Enable and configure the mysql module',
                commands: [
                  'sudo filebeat modules enable mysql',
                ],
                textPost: 'Modify the settings in the `/etc/filebeat/modules.d/mysql.yml` file.'
              },
              FILEBEAT_INSTRUCTIONS.START.RPM
            ]
          },
          {
            id: INSTRUCTION_VARIANT.WINDOWS,
            instructions: [
              FILEBEAT_INSTRUCTIONS.INSTALL.WINDOWS,
              {
                title: 'Enable and configure the mysql module',
                textPre: 'From the `C:\\Program Files\\Filebeat` folder, run:',
                commands: [
                  'PS C:\\Program Files\\Filebeat> filebeat.exe modules enable mysql',
                ],
                textPost: 'Modify the settings in the `modules.d/mysql.yml` file.'
              },
              FILEBEAT_INSTRUCTIONS.START.WINDOWS
            ]
          }
        ]
      }
    ]
  };
}
