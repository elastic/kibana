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

function getIfExists(config, key) {
  return config.has(key) && config.get(key);
}

export function createElasticCloudInstructions(config) {
  const apmServerUrl = getIfExists(config, 'xpack.cloud.apm.url');
  const instructionSets = [];

  if (!apmServerUrl) {
    instructionSets.push(getApmServerInstructionSet(config));
  }

  instructionSets.push(getApmAgentInstructionSet(config));

  return {
    instructionSets,
  };
}

function getApmServerInstructionSet(config) {
  const apmUiUrl = getIfExists(config, 'xpack.cloud.apm.ui.url');
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
                'To enable the APM Server go to [the ESS console]({essConsoleLink}). Once enabled, refresh this page.',
              values: {
                essConsoleLink: apmUiUrl,
              },
            }),
          },
        ],
      },
    ],
  };
}

function getApmAgentInstructionSet(config) {
  const apmServerUrl = getIfExists(config, 'xpack.cloud.apm.url');
  const secretToken = getIfExists(config, 'xpack.cloud.apm.secret_token');

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
