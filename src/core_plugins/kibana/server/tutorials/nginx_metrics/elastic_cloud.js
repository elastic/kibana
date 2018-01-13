import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';
import { METRICBEAT_INSTRUCTIONS } from '../../../common/tutorials/metricbeat_instructions';
import { METRICBEAT_CLOUD_INSTRUCTIONS } from '../../../common/tutorials/metricbeat_cloud_instructions';
import { ENABLE_INSTRUCTIONS } from './enable';

export const ELASTIC_CLOUD_INSTRUCTIONS = {
  instructionSets: [
    {
      title: 'Getting Started',
      instructionVariants: [
        {
          id: INSTRUCTION_VARIANT.OSX,
          instructions: [
            METRICBEAT_INSTRUCTIONS.INSTALL.OSX,
            METRICBEAT_CLOUD_INSTRUCTIONS.CONFIG.OSX,
            ENABLE_INSTRUCTIONS.OSX,
            METRICBEAT_INSTRUCTIONS.START.OSX
          ]
        },
        {
          id: INSTRUCTION_VARIANT.DEB,
          instructions: [
            METRICBEAT_INSTRUCTIONS.INSTALL.DEB,
            METRICBEAT_CLOUD_INSTRUCTIONS.CONFIG.DEB,
            ENABLE_INSTRUCTIONS.DEB,
            METRICBEAT_INSTRUCTIONS.START.DEB
          ]
        },
        {
          id: INSTRUCTION_VARIANT.RPM,
          instructions: [
            METRICBEAT_INSTRUCTIONS.INSTALL.RPM,
            METRICBEAT_CLOUD_INSTRUCTIONS.CONFIG.RPM,
            ENABLE_INSTRUCTIONS.RPM,
            METRICBEAT_INSTRUCTIONS.START.RPM
          ]
        },
        {
          id: INSTRUCTION_VARIANT.WINDOWS,
          instructions: [
            METRICBEAT_INSTRUCTIONS.INSTALL.WINDOWS,
            METRICBEAT_CLOUD_INSTRUCTIONS.CONFIG.WINDOWS,
            ENABLE_INSTRUCTIONS.WINDOWS,
            METRICBEAT_INSTRUCTIONS.START.WINDOWS
          ]
        }
      ]
    }
  ]
};
