import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';
import {
  DOWNLOAD_SERVER,
  WINDOWS_SERVER_INSTRUCTIONS,
  UNIX_FAMILY_SERVER_INSTRUCTIONS
} from './apm_server_instructions';
import {
  NODE_CLIENT_INSTRUCTIONS,
  DJANGO_CLIENT_INSTRUCTIONS,
  FLASK_CLIENT_INSTRUCTIONS,
  RAILS_CLIENT_INSTRUCTIONS,
  RACK_CLIENT_INSTRUCTIONS,
  JS_CLIENT_INSTRUCTIONS,
} from './apm_client_instructions';

export const ON_PREM_INSTRUCTIONS = {
  instructionSets: [
    {
      title: 'APM Server',
      instructionVariants: [
        {
          id: INSTRUCTION_VARIANT.OSX,
          instructions: [
            {
              ...DOWNLOAD_SERVER,
              commands: [
                'curl -L -O https://artifacts.elastic.co/downloads/apm-server/apm-server-6.2.0-darwin-x86_64.tar.gz',
                'tar xzvf apm-server-6.2.0-darwin-x86_64.tar.gz',
                'cd apm-server-6.2.0-darwin-x86_64/',
              ]
            },
            ...UNIX_FAMILY_SERVER_INSTRUCTIONS
          ]
        },
        {
          id: INSTRUCTION_VARIANT.DEB,
          instructions: [
            {
              ...DOWNLOAD_SERVER,
              commands: [
                'curl -L -O https://artifacts.elastic.co/downloads/apm-server/apm-server-6.2.0-amd64.deb',
                'sudo dpkg -i apm-server-6.2.0-amd64.deb',
              ],
              textPost: 'Looking for the 32-bit packages? See the [Download page]({config.docs.base_url}downloads/apm/apm-server).'
            },
            ...UNIX_FAMILY_SERVER_INSTRUCTIONS
          ]
        },
        {
          id: INSTRUCTION_VARIANT.RPM,
          instructions: [
            {
              ...DOWNLOAD_SERVER,
              commands: [
                'curl -L -O https://artifacts.elastic.co/downloads/apm-server/apm-server-6.2.0-x86_64.rpm',
                'sudo rpm -vi apm-server-6.2.0-x86_64.rpm'
              ],
              textPost: 'Looking for the 32-bit packages? See the [Download page]({config.docs.base_url}downloads/apm/apm-server).'
            },
            ...UNIX_FAMILY_SERVER_INSTRUCTIONS
          ]
        },
        {
          id: INSTRUCTION_VARIANT.WINDOWS,
          instructions: WINDOWS_SERVER_INSTRUCTIONS
        }
      ]
    },
    {
      title: 'APM Agents',
      instructionVariants: [
        {
          id: INSTRUCTION_VARIANT.NODE,
          instructions: NODE_CLIENT_INSTRUCTIONS
        },
        {
          id: INSTRUCTION_VARIANT.DJANGO,
          instructions: DJANGO_CLIENT_INSTRUCTIONS
        },
        {
          id: INSTRUCTION_VARIANT.FLASK,
          instructions: FLASK_CLIENT_INSTRUCTIONS
        },
        {
          id: INSTRUCTION_VARIANT.RAILS,
          instructions: RAILS_CLIENT_INSTRUCTIONS
        },
        {
          id: INSTRUCTION_VARIANT.RACK,
          instructions: RACK_CLIENT_INSTRUCTIONS
        },
        {
          id: INSTRUCTION_VARIANT.JS,
          instructions: JS_CLIENT_INSTRUCTIONS
        }
      ]
    }
  ]
};
