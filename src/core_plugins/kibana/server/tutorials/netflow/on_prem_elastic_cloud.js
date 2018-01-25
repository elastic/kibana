import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';
import { LOGSTASH_INSTRUCTIONS } from '../../../common/tutorials/logstash_instructions';
import {
  TRYCLOUD_OPTION1,
  TRYCLOUD_OPTION2
} from '../../../common/tutorials/onprem_cloud_instructions';
import { COMMON_NETFLOW_INSTRUCTIONS } from './common_instructions';

// TODO: compare with onPrem and elasticCloud scenarios and extract out common bits
export const ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS = {
  instructionSets: [
    {
      title: 'Getting Started',
      instructionVariants: [
        {
          id: INSTRUCTION_VARIANT.OSX,
          instructions: [
            TRYCLOUD_OPTION1,
            TRYCLOUD_OPTION2,
            ...LOGSTASH_INSTRUCTIONS.INSTALL.OSX,
            ...COMMON_NETFLOW_INSTRUCTIONS.CONFIG.ON_PREM_ELASTIC_CLOUD.OSX,
            ...COMMON_NETFLOW_INSTRUCTIONS.SETUP.OSX
          ]
        },
        {
          id: INSTRUCTION_VARIANT.WINDOWS,
          instructions: [
            TRYCLOUD_OPTION1,
            TRYCLOUD_OPTION2,
            ...LOGSTASH_INSTRUCTIONS.INSTALL.WINDOWS,
            ...COMMON_NETFLOW_INSTRUCTIONS.CONFIG.ON_PREM_ELASTIC_CLOUD.WINDOWS,
            ...COMMON_NETFLOW_INSTRUCTIONS.SETUP.WINDOWS
          ]
        }
      ]
    }
  ]
};
