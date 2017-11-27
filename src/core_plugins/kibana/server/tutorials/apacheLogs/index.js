import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';
import { FILEBEAT_INSTRUCTIONS } from '../../../common/tutorials/filebeat_instructions';

export function apacheLogsSpecProvider() {
  return {
    id: 'apacheLogs',
    name: 'Apache logs',
    category: TUTORIAL_CATEGORY.LOGGING,
    shortDescription: 'Collect and parse access and error logs created by the Apache HTTP server.',
    longDescription: 'The apache2 Filebeat module parses access and error logs created by the Apache 2 HTTP server.' +
                     ' [Learn more]({config.docs.beats.filebeat}/filebeat-module-apache2.html)' +
                     ' about the apache2 module.',
    //iconPath: '', TODO
    completionTimeMinutes: 10,
    previewImagePath: '/plugins/kibana/home/tutorial_resources/apacheLogs/kibana-apache2.png',
    instructionSets: [
      {
        title: 'Getting Started',
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.OSX,
            instructions: [
              FILEBEAT_INSTRUCTIONS.INSTALL.OSX,
              {
                title: 'Enable and configure the apache2 module',
                textPre: 'From the installation directory, run:',
                commands: [
                  './filebeat modules enable apache2',
                ],
                textPost: 'Modify the settings in the `modules.d/apache2.yml` file.'
              },
              FILEBEAT_INSTRUCTIONS.START.OSX
            ]
          },
          {
            id: INSTRUCTION_VARIANT.DEB,
            instructions: [
              FILEBEAT_INSTRUCTIONS.INSTALL.DEB,
              {
                title: 'Enable and configure the apache2 module',
                commands: [
                  'sudo filebeat modules enable apache2',
                ],
                textPost: 'Modify the settings in the `/etc/filebeat/modules.d/apache2.yml` file.'
              },
              FILEBEAT_INSTRUCTIONS.START.DEB
            ]
          },
          {
            id: INSTRUCTION_VARIANT.RPM,
            instructions: [
              FILEBEAT_INSTRUCTIONS.INSTALL.RPM,
              {
                title: 'Enable and configure the apache2 module',
                commands: [
                  'sudo filebeat modules enable apache2',
                ],
                textPost: 'Modify the settings in the `/etc/filebeat/modules.d/apache2.yml` file.'
              },
              FILEBEAT_INSTRUCTIONS.START.RPM
            ]
          },
          {
            id: INSTRUCTION_VARIANT.WINDOWS,
            instructions: [
              FILEBEAT_INSTRUCTIONS.INSTALL.WINDOWS,
              {
                title: 'Enable and configure the apache2 module',
                textPre: 'From the `C:\\Program Files\\Filebeat` folder, run:',
                commands: [
                  'PS C:\\Program Files\\Filebeat> filebeat.exe modules enable apache2',
                ],
                textPost: 'Modify the settings in the `modules.d/apache2.yml` file.'
              },
              FILEBEAT_INSTRUCTIONS.START.WINDOWS
            ]
          }
        ]
      }
    ]
  };
}
