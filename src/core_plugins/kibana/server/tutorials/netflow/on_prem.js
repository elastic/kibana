import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';
import { LOGSTASH_INSTRUCTIONS } from '../../../common/tutorials/logstash_instructions';
import { COMMON_NETFLOW_INSTRUCTIONS } from './common_instructions';

// TODO: compare with onPremElasticCloud and elasticCloud scenarios and extract out common bits
export const ON_PREM_INSTRUCTIONS = {
  instructionSets: [
    {
      title: 'Getting Started',
      instructionVariants: [
        {
          id: INSTRUCTION_VARIANT.OSX,
          instructions: [
            ...LOGSTASH_INSTRUCTIONS.INSTALL.OSX,
            ...COMMON_NETFLOW_INSTRUCTIONS.CONFIG.ON_PREM.OSX,
            ...COMMON_NETFLOW_INSTRUCTIONS.SETUP.OSX
          ]
        },
        {
          id: INSTRUCTION_VARIANT.WINDOWS,
          instructions: [
            ...LOGSTASH_INSTRUCTIONS.INSTALL.WINDOWS,
            ...COMMON_NETFLOW_INSTRUCTIONS.CONFIG.ON_PREM.WINDOWS,
            ...COMMON_NETFLOW_INSTRUCTIONS.SETUP.WINDOWS
          ]
        }
      ]
    }
  ]
};
