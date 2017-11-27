import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';
import { FILEBEAT_INSTRUCTIONS } from '../../../common/tutorials/filebeat_instructions';

export function nginxLogsSpecProvider() {
  return {
    id: 'nginxLogs',
    name: 'Nginx logs',
    category: TUTORIAL_CATEGORY.LOGGING,
    shortDescription: 'Collect and parse access and error logs created by the Nginx HTTP server.',
    longDescription: 'The nginx Filebeat module parses access and error logs created by the Nginx HTTP server.' +
                     ' [Learn more]({config.docs.beats.filebeat}/filebeat-module-nginx.html)' +
                     ' about the nginx module.',
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
                title: 'Enable and configure the nginx module',
                textPre: 'From the installation directory, run:',
                commands: [
                  './filebeat modules enable nginx',
                ],
                textPost: 'Modify the settings in the `modules.d/nginx.yml` file.'
              },
              FILEBEAT_INSTRUCTIONS.START.OSX
            ]
          },
          {
            id: INSTRUCTION_VARIANT.DEB,
            instructions: [
              FILEBEAT_INSTRUCTIONS.INSTALL.DEB,
              {
                title: 'Enable and configure the nginx module',
                commands: [
                  'sudo filebeat modules enable nginx',
                ],
                textPost: 'Modify the settings in the `/etc/filebeat/modules.d/nginx.yml` file.'
              },
              FILEBEAT_INSTRUCTIONS.START.DEB
            ]
          },
          {
            id: INSTRUCTION_VARIANT.RPM,
            instructions: [
              FILEBEAT_INSTRUCTIONS.INSTALL.RPM,
              {
                title: 'Enable and configure the nginx module',
                commands: [
                  'sudo filebeat modules enable nginx',
                ],
                textPost: 'Modify the settings in the `/etc/filebeat/modules.d/nginx.yml` file.'
              },
              FILEBEAT_INSTRUCTIONS.START.RPM
            ]
          },
          {
            id: INSTRUCTION_VARIANT.WINDOWS,
            instructions: [
              FILEBEAT_INSTRUCTIONS.INSTALL.WINDOWS,
              {
                title: 'Enable and configure the nginx module',
                textPre: 'From the `C:\\Program Files\\Filebeat` folder, run:',
                commands: [
                  'PS C:\\Program Files\\Filebeat> filebeat.exe modules enable nginx',
                ],
                textPost: 'Modify the settings in the `modules.d/nginx.yml` file.'
              },
              FILEBEAT_INSTRUCTIONS.START.WINDOWS
            ]
          }
        ]
      }
    ]
  };
}
