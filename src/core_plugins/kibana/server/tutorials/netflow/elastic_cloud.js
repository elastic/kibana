import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';
import { LOGSTASH_INSTRUCTIONS } from '../../../common/tutorials/logstash_instructions';
import { COMMON_NETFLOW_INSTRUCTIONS } from './common_instructions';

// TODO: compare with onPremElasticCloud and onPrem scenarios and extract out common bits
export const ELASTIC_CLOUD_INSTRUCTIONS = {
  instructionSets: [
    {
      title: 'Getting Started',
      instructionVariants: [
        {
          id: INSTRUCTION_VARIANT.OSX,
          instructions: [
            ...LOGSTASH_INSTRUCTIONS.INSTALL.OSX,
            ...COMMON_NETFLOW_INSTRUCTIONS.CONFIG.ELASTIC_CLOUD.OSX,
            ...COMMON_NETFLOW_INSTRUCTIONS.SETUP.OSX
          ]
        },
        {
          id: INSTRUCTION_VARIANT.WINDOWS,
          instructions: [
            ...LOGSTASH_INSTRUCTIONS.INSTALL.WINDOWS,
            ...COMMON_NETFLOW_INSTRUCTIONS.CONFIG.ELASTIC_CLOUD.WINDOWS,
            ...COMMON_NETFLOW_INSTRUCTIONS.SETUP.WINDOWS
          ]
        }
      ]
    }
  ]
};
