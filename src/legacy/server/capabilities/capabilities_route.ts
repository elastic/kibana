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

import Joi from 'joi';
import { Server } from 'hapi';

import { CapabilitiesModifier } from '.';
import { Capabilities } from '../../../core/public';
import { mergeCapabilities } from './merge_capabilities';

export const registerCapabilitiesRoute = (
  server: Server,
  defaultCapabilities: Capabilities,
  modifiers: CapabilitiesModifier[]
) => {
  server.route({
    path: '/api/capabilities',
    method: 'POST',
    options: {
      validate: {
        payload: Joi.object({
          capabilities: Joi.object().required(),
        }).required(),
      },
    },
    async handler(request) {
      let { capabilities } = request.payload as { capabilities: Capabilities };
      capabilities = mergeCapabilities({ ...defaultCapabilities }, capabilities);

      for (const provider of modifiers) {
        capabilities = await provider(request, capabilities);
      }

      return {
        capabilities,
      };
    },
  });
};
