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
  NODE_CLIENT_INSTRUCTIONS,
  DJANGO_CLIENT_INSTRUCTIONS,
  FLASK_CLIENT_INSTRUCTIONS,
  RAILS_CLIENT_INSTRUCTIONS,
  RACK_CLIENT_INSTRUCTIONS,
  JS_CLIENT_INSTRUCTIONS,
  GO_CLIENT_INSTRUCTIONS,
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
        {
          id: INSTRUCTION_VARIANT.GO,
          instructions: [SERVER_URL_INSTRUCTION, ...GO_CLIENT_INSTRUCTIONS],
        },
      ],
    },
  ],
};
