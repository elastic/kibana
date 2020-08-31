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
import { INSTRUCTION_VARIANT } from '../../../../home/server';
import {
  createWindowsServerInstructions,
  createEditConfig,
  createStartServerUnixSysv,
  createStartServerUnix,
  createDownloadServerRpm,
  createDownloadServerDeb,
  createDownloadServerOsx,
} from '../instructions/apm_server_instructions';
import {
  createNodeAgentInstructions,
  createDjangoAgentInstructions,
  createFlaskAgentInstructions,
  createRailsAgentInstructions,
  createRackAgentInstructions,
  createJsAgentInstructions,
  createGoAgentInstructions,
  createJavaAgentInstructions,
  createDotNetAgentInstructions,
} from '../instructions/apm_agent_instructions';

export function onPremInstructions({
  errorIndices,
  transactionIndices,
  metricsIndices,
  sourcemapIndices,
  onboardingIndices,
}: {
  errorIndices: string;
  transactionIndices: string;
  metricsIndices: string;
  sourcemapIndices: string;
  onboardingIndices: string;
}) {
  const EDIT_CONFIG = createEditConfig();
  const START_SERVER_UNIX = createStartServerUnix();
  const START_SERVER_UNIX_SYSV = createStartServerUnixSysv();

  return {
    instructionSets: [
      {
        title: i18n.translate('apmOss.tutorial.apmServer.title', {
          defaultMessage: 'APM Server',
        }),
        callOut: {
          title: i18n.translate('apmOss.tutorial.apmServer.callOut.title', {
            defaultMessage: 'Important: Updating to 7.0 or higher',
          }),
          message: i18n.translate('apmOss.tutorial.apmServer.callOut.message', {
            defaultMessage: `Please make sure your APM Server is updated to 7.0 or higher. \
            You can also migrate your 6.x data with the migration assistant found in Kibana's management section.`,
          }),
          iconType: 'alert',
        },
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.OSX,
            instructions: [createDownloadServerOsx(), EDIT_CONFIG, START_SERVER_UNIX],
          },
          {
            id: INSTRUCTION_VARIANT.DEB,
            instructions: [createDownloadServerDeb(), EDIT_CONFIG, START_SERVER_UNIX_SYSV],
          },
          {
            id: INSTRUCTION_VARIANT.RPM,
            instructions: [createDownloadServerRpm(), EDIT_CONFIG, START_SERVER_UNIX_SYSV],
          },
          {
            id: INSTRUCTION_VARIANT.WINDOWS,
            instructions: createWindowsServerInstructions(),
          },
        ],
        statusCheck: {
          title: i18n.translate('apmOss.tutorial.apmServer.statusCheck.title', {
            defaultMessage: 'APM Server status',
          }),
          text: i18n.translate('apmOss.tutorial.apmServer.statusCheck.text', {
            defaultMessage:
              'Make sure APM Server is running before you start implementing the APM agents.',
          }),
          btnLabel: i18n.translate('apmOss.tutorial.apmServer.statusCheck.btnLabel', {
            defaultMessage: 'Check APM Server status',
          }),
          success: i18n.translate('apmOss.tutorial.apmServer.statusCheck.successMessage', {
            defaultMessage: 'You have correctly setup APM Server',
          }),
          error: i18n.translate('apmOss.tutorial.apmServer.statusCheck.errorMessage', {
            defaultMessage:
              'No APM Server detected. Please make sure it is running and you have updated to 7.0 or higher.',
          }),
          esHitsCheck: {
            index: onboardingIndices,
            query: {
              bool: {
                filter: [
                  { term: { 'processor.event': 'onboarding' } },
                  { range: { 'observer.version_major': { gte: 7 } } },
                ],
              },
            },
          },
        },
      },
      {
        title: i18n.translate('apmOss.tutorial.apmAgents.title', {
          defaultMessage: 'APM Agents',
        }),
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.JAVA,
            instructions: createJavaAgentInstructions(),
          },
          {
            id: INSTRUCTION_VARIANT.JS,
            instructions: createJsAgentInstructions(),
          },
          {
            id: INSTRUCTION_VARIANT.NODE,
            instructions: createNodeAgentInstructions(),
          },
          {
            id: INSTRUCTION_VARIANT.DJANGO,
            instructions: createDjangoAgentInstructions(),
          },
          {
            id: INSTRUCTION_VARIANT.FLASK,
            instructions: createFlaskAgentInstructions(),
          },
          {
            id: INSTRUCTION_VARIANT.RAILS,
            instructions: createRailsAgentInstructions(),
          },
          {
            id: INSTRUCTION_VARIANT.RACK,
            instructions: createRackAgentInstructions(),
          },
          {
            id: INSTRUCTION_VARIANT.GO,
            instructions: createGoAgentInstructions(),
          },
          {
            id: INSTRUCTION_VARIANT.DOTNET,
            instructions: createDotNetAgentInstructions(),
          },
        ],
        statusCheck: {
          title: i18n.translate('apmOss.tutorial.apmAgents.statusCheck.title', {
            defaultMessage: 'Agent status',
          }),
          text: i18n.translate('apmOss.tutorial.apmAgents.statusCheck.text', {
            defaultMessage:
              'Make sure your application is running and the agents are sending data.',
          }),
          btnLabel: i18n.translate('apmOss.tutorial.apmAgents.statusCheck.btnLabel', {
            defaultMessage: 'Check agent status',
          }),
          success: i18n.translate('apmOss.tutorial.apmAgents.statusCheck.successMessage', {
            defaultMessage: 'Data successfully received from one or more agents',
          }),
          error: i18n.translate('apmOss.tutorial.apmAgents.statusCheck.errorMessage', {
            defaultMessage: 'No data has been received from agents yet',
          }),
          esHitsCheck: {
            index: [errorIndices, transactionIndices, metricsIndices, sourcemapIndices],
            query: {
              bool: {
                filter: [
                  {
                    terms: {
                      'processor.event': ['error', 'transaction', 'metric', 'sourcemap'],
                    },
                  },
                  { range: { 'observer.version_major': { gte: 7 } } },
                ],
              },
            },
          },
        },
      },
    ],
  };
}
