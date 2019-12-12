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

import { get, has } from 'lodash';
import { i18n } from '@kbn/i18n';
import { INSTRUCTION_VARIANT } from '../../../../common/tutorials/instruction_variant';

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

function getIfExists(obj, key) {
  return has(obj, key) && get(obj, key);
}

export function createElasticCloudInstructions(cloudSetup) {
  const apmServerUrl = getIfExists(cloudSetup, 'apm.url');
  const instructionSets = [];

  if (!apmServerUrl) {
    instructionSets.push(getApmServerInstructionSet(cloudSetup));
  }

  instructionSets.push(getApmAgentInstructionSet(cloudSetup));

  return {
    instructionSets,
  };
}

function getApmServerInstructionSet(cloudSetup) {
  const cloudId = getIfExists(cloudSetup, 'cloudId');
  return {
    title: i18n.translate('kbn.server.tutorials.apm.apmServer.title', {
      defaultMessage: 'APM Server',
    }),
    instructionVariants: [
      {
        id: INSTRUCTION_VARIANT.ESC,
        instructions: [
          {
            title: 'Enable the APM Server in the ESS console',
            textPre: i18n.translate('kbn.server.tutorials.apm.elasticCloud.textPre', {
              defaultMessage:
                'To enable the APM Server go to [the Elastic Cloud console](https://cloud.elastic.co/deployments?q={cloudId}) and enable APM in the deployment settings. Once enabled, refresh this page.',
              values: { cloudId },
            }),
          },
        ],
      },
    ],
  };
}

function getApmAgentInstructionSet(cloudSetup) {
  const apmServerUrl = getIfExists(cloudSetup, 'apm.url');
  const secretToken = getIfExists(cloudSetup, 'apm.secretToken');

  return {
    title: i18n.translate('kbn.server.tutorials.apm.elasticCloudInstructions.title', {
      defaultMessage: 'APM Agents',
    }),
    instructionVariants: [
      {
        id: INSTRUCTION_VARIANT.NODE,
        instructions: createNodeAgentInstructions(apmServerUrl, secretToken),
      },
      {
        id: INSTRUCTION_VARIANT.DJANGO,
        instructions: createDjangoAgentInstructions(apmServerUrl, secretToken),
      },
      {
        id: INSTRUCTION_VARIANT.FLASK,
        instructions: createFlaskAgentInstructions(apmServerUrl, secretToken),
      },
      {
        id: INSTRUCTION_VARIANT.RAILS,
        instructions: createRailsAgentInstructions(apmServerUrl, secretToken),
      },
      {
        id: INSTRUCTION_VARIANT.RACK,
        instructions: createRackAgentInstructions(apmServerUrl, secretToken),
      },
      {
        id: INSTRUCTION_VARIANT.JS,
        instructions: createJsAgentInstructions(apmServerUrl),
      },
      {
        id: INSTRUCTION_VARIANT.GO,
        instructions: createGoAgentInstructions(apmServerUrl, secretToken),
      },
      {
        id: INSTRUCTION_VARIANT.JAVA,
        instructions: createJavaAgentInstructions(apmServerUrl, secretToken),
      },
      {
        id: INSTRUCTION_VARIANT.DOTNET,
        instructions: createDotNetAgentInstructions(apmServerUrl, secretToken),
      },
    ],
  };
}
