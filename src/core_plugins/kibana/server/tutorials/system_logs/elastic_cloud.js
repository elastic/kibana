import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';
import { FILEBEAT_INSTRUCTIONS } from '../../../common/tutorials/filebeat_instructions';
import { FILEBEAT_CLOUD_INSTRUCTIONS } from '../../../common/tutorials/filebeat_cloud_instructions';
import { ENABLE_INSTRUCTIONS } from './enable';

export const ELASTIC_CLOUD_INSTRUCTIONS = {
  instructionSets: [
    {
      title: 'Getting Started',
      instructionVariants: [
        {
          id: INSTRUCTION_VARIANT.OSX,
          instructions: [
            FILEBEAT_INSTRUCTIONS.INSTALL.OSX,
            FILEBEAT_CLOUD_INSTRUCTIONS.CONFIG.OSX,
            ENABLE_INSTRUCTIONS.OSX,
            FILEBEAT_INSTRUCTIONS.START.OSX
          ]
        },
        {
          id: INSTRUCTION_VARIANT.DEB,
          instructions: [
            FILEBEAT_INSTRUCTIONS.INSTALL.DEB,
            FILEBEAT_CLOUD_INSTRUCTIONS.CONFIG.DEB,
            ENABLE_INSTRUCTIONS.DEB,
            FILEBEAT_INSTRUCTIONS.START.DEB
          ]
        },
        {
          id: INSTRUCTION_VARIANT.RPM,
          instructions: [
            FILEBEAT_INSTRUCTIONS.INSTALL.RPM,
            FILEBEAT_CLOUD_INSTRUCTIONS.CONFIG.RPM,
            ENABLE_INSTRUCTIONS.RPM,
            FILEBEAT_INSTRUCTIONS.START.RPM
          ]
        }
      ]
    }
  ]
};
