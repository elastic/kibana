import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';

import {
  NODE_CLIENT_INSTRUCTIONS,
  DJANGO_CLIENT_INSTRUCTIONS,
  FLASK_CLIENT_INSTRUCTIONS,
  RAILS_CLIENT_INSTRUCTIONS,
  RACK_CLIENT_INSTRUCTIONS,
  JS_CLIENT_INSTRUCTIONS,
} from './apm_client_instructions';

const SERVER_URL_INSTRUCTION = {
  title: 'APM Server endpoint',
  textPre:
    `Retrieve the APM Server URL from the Deployments section on the Elastic Cloud dashboard.
    You will also need the APM Server secret token, which was generated on deployment.`,
};

export const ELASTIC_CLOUD_INSTRUCTIONS = {
  instructionSets: [
    {
      title: 'APM Agents',
      instructionVariants: [
        {
          id: INSTRUCTION_VARIANT.NODE,
          instructions: [SERVER_URL_INSTRUCTION, ...NODE_CLIENT_INSTRUCTIONS],
        },
        {
          id: INSTRUCTION_VARIANT.DJANGO,
          instructions: [SERVER_URL_INSTRUCTION, ...DJANGO_CLIENT_INSTRUCTIONS],
        },
        {
          id: INSTRUCTION_VARIANT.FLASK,
          instructions: [SERVER_URL_INSTRUCTION, ...FLASK_CLIENT_INSTRUCTIONS],
        },
        {
          id: INSTRUCTION_VARIANT.RAILS,
          instructions: [SERVER_URL_INSTRUCTION, ...RAILS_CLIENT_INSTRUCTIONS],
        },
        {
          id: INSTRUCTION_VARIANT.RACK,
          instructions: [SERVER_URL_INSTRUCTION, ...RACK_CLIENT_INSTRUCTIONS],
        },
        {
          id: INSTRUCTION_VARIANT.JS,
          instructions: [SERVER_URL_INSTRUCTION, ...JS_CLIENT_INSTRUCTIONS],
        },
      ],
    },
  ],
};
