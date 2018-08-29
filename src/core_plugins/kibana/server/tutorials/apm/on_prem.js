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

import { i18n } from '@kbn/i18n';
import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';
import {
  createWindowsServerInstructions,
  createEditConfig,
  createStartServerUnix,
  createDownloadServerRpm,
  createDownloadServerDeb,
  createDownloadServerOsx,
} from './apm_server_instructions';
import {
  createNodeClientInstructions,
  createDjangoClientInstructions,
  createFlaskClientInstructions,
  createRailsClientInstructions,
  createRackClientInstructions,
  createJsClientInstructions,
  createGoClientInstructions,
  createJavaClientInstructions,
} from './apm_client_instructions';

export function onPremInstructions(apmIndexPattern) {
  const EDIT_CONFIG = createEditConfig();
  const START_SERVER_UNIX = createStartServerUnix();

  return {
    instructionSets: [
      {
        title: i18n.translate('kbn.server.tutorials.apm.apmServer.title', {
          defaultMessage: 'APM Server',
        }),
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.OSX,
            instructions: [createDownloadServerOsx(), EDIT_CONFIG, START_SERVER_UNIX],
          },
          {
            id: INSTRUCTION_VARIANT.DEB,
            instructions: [createDownloadServerDeb(), EDIT_CONFIG, START_SERVER_UNIX],
          },
          {
            id: INSTRUCTION_VARIANT.RPM,
            instructions: [createDownloadServerRpm(), EDIT_CONFIG, START_SERVER_UNIX],
          },
          {
            id: INSTRUCTION_VARIANT.WINDOWS,
            instructions: createWindowsServerInstructions(),
          },
        ],
        statusCheck: {
          title: i18n.translate('kbn.server.tutorials.apm.apmServer.statusCheck.title', {
            defaultMessage: 'APM Server status',
          }),
          text: i18n.translate('kbn.server.tutorials.apm.apmServer.statusCheck.text', {
            defaultMessage: 'Make sure APM Server is running before you start implementing the APM agents.',
          }),
          btnLabel: i18n.translate('kbn.server.tutorials.apm.apmServer.statusCheck.btnLabel', {
            defaultMessage: 'Check APM Server status',
          }),
          success: i18n.translate('kbn.server.tutorials.apm.apmServer.statusCheck.successMessage', {
            defaultMessage: 'You have correctly setup APM-Server',
          }),
          error: i18n.translate('kbn.server.tutorials.apm.apmServer.statusCheck.errorMessage', {
            defaultMessage: 'APM-Server has still not connected to Elasticsearch',
          }),
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
        title: i18n.translate('kbn.server.tutorials.apm.apmAgents.title', {
          defaultMessage: 'APM Agents',
        }),
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.NODE,
            instructions: createNodeClientInstructions(),
          },
          {
            id: INSTRUCTION_VARIANT.DJANGO,
            instructions: createDjangoClientInstructions(),
          },
          {
            id: INSTRUCTION_VARIANT.FLASK,
            instructions: createFlaskClientInstructions(),
          },
          {
            id: INSTRUCTION_VARIANT.RAILS,
            instructions: createRailsClientInstructions(),
          },
          {
            id: INSTRUCTION_VARIANT.RACK,
            instructions: createRackClientInstructions(),
          },
          {
            id: INSTRUCTION_VARIANT.JS,
            instructions: createJsClientInstructions(),
          },
          {
            id: INSTRUCTION_VARIANT.GO,
            instructions: createGoClientInstructions(),
          },
          {
            id: INSTRUCTION_VARIANT.JAVA,
            instructions: createJavaClientInstructions(),
          },
        ],
        statusCheck: {
          title: i18n.translate('kbn.server.tutorials.apm.apmAgents.statusCheck.title', {
            defaultMessage: 'Agent status',
          }),
          text: i18n.translate('kbn.server.tutorials.apm.apmAgents.statusCheck.text', {
            defaultMessage: 'Make sure your application is running and the agents are sending data.',
          }),
          btnLabel: i18n.translate('kbn.server.tutorials.apm.apmAgents.statusCheck.btnLabel', {
            defaultMessage: 'Check agent status',
          }),
          success: i18n.translate('kbn.server.tutorials.apm.apmAgents.statusCheck.successMessage', {
            defaultMessage: 'Data successfully received from one or more agents',
          }),
          error: i18n.translate('kbn.server.tutorials.apm.apmAgents.statusCheck.errorMessage', {
            defaultMessage: 'No data has been received from agents yet',
          }),
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
