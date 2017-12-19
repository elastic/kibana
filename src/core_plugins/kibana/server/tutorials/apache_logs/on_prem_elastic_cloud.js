import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';
import { FILEBEAT_INSTRUCTIONS } from '../../../common/tutorials/filebeat_instructions';
import { FILEBEAT_CLOUD_INSTRUCTIONS } from '../../../common/tutorials/filebeat_cloud_instructions';
import { FILEBEAT_ONPREM_CLOUD_INSTRUCTIONS } from '../../../common/tutorials/filebeat_onprem_cloud_instructions';

export const ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS = {
  instructionSets: [
    {
      title: 'Getting Started',
      instructionVariants: [
        {
          id: INSTRUCTION_VARIANT.OSX,
          instructions: [
            FILEBEAT_ONPREM_CLOUD_INSTRUCTIONS.TRYCLOUD_OPTION1,
            FILEBEAT_ONPREM_CLOUD_INSTRUCTIONS.TRYCLOUD_OPTION2,
            FILEBEAT_CLOUD_INSTRUCTIONS.INSTALL.OSX,
            FILEBEAT_ONPREM_CLOUD_INSTRUCTIONS.CONFIG.OSX,
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
            FILEBEAT_ONPREM_CLOUD_INSTRUCTIONS.TRYCLOUD_OPTION1,
            FILEBEAT_ONPREM_CLOUD_INSTRUCTIONS.TRYCLOUD_OPTION2,
            FILEBEAT_CLOUD_INSTRUCTIONS.INSTALL.DEB,
            FILEBEAT_ONPREM_CLOUD_INSTRUCTIONS.CONFIG.DEB,
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
            FILEBEAT_ONPREM_CLOUD_INSTRUCTIONS.TRYCLOUD_OPTION1,
            FILEBEAT_ONPREM_CLOUD_INSTRUCTIONS.TRYCLOUD_OPTION2,
            FILEBEAT_CLOUD_INSTRUCTIONS.INSTALL.RPM,
            FILEBEAT_ONPREM_CLOUD_INSTRUCTIONS.CONFIG.RPM,
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
            FILEBEAT_ONPREM_CLOUD_INSTRUCTIONS.TRYCLOUD_OPTION1,
            FILEBEAT_ONPREM_CLOUD_INSTRUCTIONS.TRYCLOUD_OPTION2,
            FILEBEAT_CLOUD_INSTRUCTIONS.INSTALL.WINDOWS,
            FILEBEAT_ONPREM_CLOUD_INSTRUCTIONS.CONFIG.WINDOWS,
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
