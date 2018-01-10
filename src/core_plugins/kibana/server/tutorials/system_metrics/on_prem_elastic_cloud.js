import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';
import { METRICBEAT_INSTRUCTIONS } from '../../../common/tutorials/metricbeat_instructions';
import {
  TRYCLOUD_OPTION1,
  TRYCLOUD_OPTION2
} from '../../../common/tutorials/onprem_cloud_instructions';
import { ENABLE_INSTRUCTIONS } from './enable';

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
            METRICBEAT_INSTRUCTIONS.INSTALL.OSX,
            METRICBEAT_INSTRUCTIONS.CONFIG.OSX,
            ENABLE_INSTRUCTIONS.OSX,
            METRICBEAT_INSTRUCTIONS.START.OSX
          ]
        },
        {
          id: INSTRUCTION_VARIANT.DEB,
          instructions: [
            TRYCLOUD_OPTION1,
            TRYCLOUD_OPTION2,
            METRICBEAT_INSTRUCTIONS.INSTALL.DEB,
            METRICBEAT_INSTRUCTIONS.CONFIG.DEB,
            ENABLE_INSTRUCTIONS.DEB,
            METRICBEAT_INSTRUCTIONS.START.DEB
          ]
        },
        {
          id: INSTRUCTION_VARIANT.RPM,
          instructions: [
            TRYCLOUD_OPTION1,
            TRYCLOUD_OPTION2,
            METRICBEAT_INSTRUCTIONS.INSTALL.RPM,
            METRICBEAT_INSTRUCTIONS.CONFIG.RPM,
            ENABLE_INSTRUCTIONS.RPM,
            METRICBEAT_INSTRUCTIONS.START.RPM
          ]
        },
        {
          id: INSTRUCTION_VARIANT.WINDOWS,
          instructions: [
            TRYCLOUD_OPTION1,
            TRYCLOUD_OPTION2,
            METRICBEAT_INSTRUCTIONS.INSTALL.WINDOWS,
            METRICBEAT_INSTRUCTIONS.CONFIG.WINDOWS,
            ENABLE_INSTRUCTIONS.WINDOWS,
            METRICBEAT_INSTRUCTIONS.START.WINDOWS
          ]
        }
      ]
    }
  ]
};
