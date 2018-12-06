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
  createNodeClientInstructions,
  createDjangoClientInstructions,
  createFlaskClientInstructions,
  createRailsClientInstructions,
  createRackClientInstructions,
  createJsClientInstructions,
  createGoClientInstructions,
  createJavaClientInstructions,
} from './apm_client_instructions';

const createServerUrlInstruction = () => ({
  title: i18n.translate('kbn.server.tutorials.apm.serverUrlInstruction.title', {
    defaultMessage: 'APM Server endpoint',
  }),
  textPre: i18n.translate('kbn.server.tutorials.apm.serverUrlInstruction.textPre', {
    defaultMessage: 'Retrieve the APM Server URL from the Deployments section on the Elastic Cloud dashboard. \
You will also need the APM Server secret token, which was generated on deployment.',
  }),
});

export function createElasticCloudInstructions() {
  const SERVER_URL_INSTRUCTION = createServerUrlInstruction();

  return {
    instructionSets: [
      {
        title: i18n.translate('kbn.server.tutorials.apm.elasticCloudInstructions.title', {
          defaultMessage: 'APM Agents',
        }),
        instructionVariants: [
          {
            id: INSTRUCTION_VARIANT.NODE,
            instructions: [SERVER_URL_INSTRUCTION, ...createNodeClientInstructions()],
          },
          {
            id: INSTRUCTION_VARIANT.DJANGO,
            instructions: [SERVER_URL_INSTRUCTION, ...createDjangoClientInstructions()],
          },
          {
            id: INSTRUCTION_VARIANT.FLASK,
            instructions: [SERVER_URL_INSTRUCTION, ...createFlaskClientInstructions()],
          },
          {
            id: INSTRUCTION_VARIANT.RAILS,
            instructions: [SERVER_URL_INSTRUCTION, ...createRailsClientInstructions()],
          },
          {
            id: INSTRUCTION_VARIANT.RACK,
            instructions: [SERVER_URL_INSTRUCTION, ...createRackClientInstructions()],
          },
          {
            id: INSTRUCTION_VARIANT.JS,
            instructions: [SERVER_URL_INSTRUCTION, ...createJsClientInstructions()],
          },
          {
            id: INSTRUCTION_VARIANT.GO,
            instructions: [SERVER_URL_INSTRUCTION, ...createGoClientInstructions()],
          },
          {
            id: INSTRUCTION_VARIANT.JAVA,
            instructions: [SERVER_URL_INSTRUCTION, ...createJavaClientInstructions()],
          },
        ],
      },
    ],
  };
}
