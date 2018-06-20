/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';
import {
  WINDOWS_SERVER_INSTRUCTIONS,
  IMPORT_DASHBOARD_UNIX,
  EDIT_CONFIG,
  START_SERVER_UNIX,
  DOWNLOAD_SERVER_RPM,
  DOWNLOAD_SERVER_DEB,
  DOWNLOAD_SERVER_OSX,
} from './apm_server_instructions';
import {
  NODE_CLIENT_INSTRUCTIONS,
  DJANGO_CLIENT_INSTRUCTIONS,
  FLASK_CLIENT_INSTRUCTIONS,
  RAILS_CLIENT_INSTRUCTIONS,
  RACK_CLIENT_INSTRUCTIONS,
  JS_CLIENT_INSTRUCTIONS,
  GO_CLIENT_INSTRUCTIONS,
} from './apm_client_instructions';

export function onPremInstructions(server) {
  let apmIndexPattern = 'apm*';
  try {
    apmIndexPattern = server.config().get('xpack.apm.indexPattern');
  } catch (error) {
    // ignore error when config does not contain 'xpack.apm.indexPattern'.
    // This is expected when APM plugin is not running.
  }

  return {
    instructionSets: [
      {
        title: 'APM Server',
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.OSX,
            instructions: [
              DOWNLOAD_SERVER_OSX,
              IMPORT_DASHBOARD_UNIX,
              EDIT_CONFIG,
              START_SERVER_UNIX,
            ],
          },
          {
            id: INSTRUCTION_VARIANT.DEB,
            instructions: [
              DOWNLOAD_SERVER_DEB,
              IMPORT_DASHBOARD_UNIX,
              EDIT_CONFIG,
              START_SERVER_UNIX,
            ],
          },
          {
            id: INSTRUCTION_VARIANT.RPM,
            instructions: [
              DOWNLOAD_SERVER_RPM,
              IMPORT_DASHBOARD_UNIX,
              EDIT_CONFIG,
              START_SERVER_UNIX,
            ],
          },
          {
            id: INSTRUCTION_VARIANT.WINDOWS,
            instructions: WINDOWS_SERVER_INSTRUCTIONS,
          },
        ],
        statusCheck: {
          title: 'APM Server status',
          text:
            'Make sure APM Server is running before you start implementing the APM agents.',
          btnLabel: 'Check APM Server status',
          success: 'You have correctly setup APM-Server',
          error: 'APM-Server has still not connected to Elasticsearch',
          esHitsCheck: {
            index: apmIndexPattern,
            query: {
              bool: {
                filter: {
                  exists: {
                    field: 'listening',
                  },
                },
              },
            },
          },
        },
      },
      {
        title: 'APM Agents',
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.NODE,
            instructions: NODE_CLIENT_INSTRUCTIONS,
          },
          {
            id: INSTRUCTION_VARIANT.DJANGO,
            instructions: DJANGO_CLIENT_INSTRUCTIONS,
          },
          {
            id: INSTRUCTION_VARIANT.FLASK,
            instructions: FLASK_CLIENT_INSTRUCTIONS,
          },
          {
            id: INSTRUCTION_VARIANT.RAILS,
            instructions: RAILS_CLIENT_INSTRUCTIONS,
          },
          {
            id: INSTRUCTION_VARIANT.RACK,
            instructions: RACK_CLIENT_INSTRUCTIONS,
          },
          {
            id: INSTRUCTION_VARIANT.JS,
            instructions: JS_CLIENT_INSTRUCTIONS,
          },
          {
            id: INSTRUCTION_VARIANT.GO,
            instructions: GO_CLIENT_INSTRUCTIONS,
          },
        ],
        statusCheck: {
          title: 'Agent status',
          text:
            'Make sure you application is running, and the agents are sending data',
          btnLabel: 'Check agent status',
          success: 'Data succesfully received from one or more agents',
          error: `No data has been received from agents yet`,
          esHitsCheck: {
            index: apmIndexPattern,
            query: {
              bool: {
                filter: {
                  exists: {
                    field: 'processor.name',
                  },
                },
              },
            },
          },
        },
      },
    ],
  };
}
