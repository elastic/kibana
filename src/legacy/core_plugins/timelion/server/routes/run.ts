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
import Bluebird from 'bluebird';
import _ from 'lodash';
import { Legacy } from 'kibana';
// @ts-ignore
import chainRunnerFn from '../handlers/chain_runner.js';
// @ts-ignore
import getNamespacesSettings from '../lib/get_namespaced_settings';
// @ts-ignore
import getTlConfig from '../handlers/lib/tl_config';

const timelionDefaults = getNamespacesSettings();

export interface TimelionRequestQuery {
  payload: {
    sheet: string[];
    extended?: {
      es: {
        filter: {
          bool: {
            filter: string[] | object;
            must: string[];
            should: string[];
            must_not: string[];
          };
        };
      };
    };
  };
  time?: {
    from?: string;
    interval: string;
    timezone: string;
    to?: string;
  };
}

function formatErrorResponse(e: Error, h: Legacy.ResponseToolkit) {
  return h
    .response({
      title: e.toString(),
      message: e.toString(),
    })
    .code(500);
}

const requestPayload = {
  payload: Joi.object({
    sheet: Joi.array()
      .items(Joi.string())
      .required(),
    extended: Joi.object({
      es: Joi.object({
        filter: Joi.object({
          bool: Joi.object({
            filter: Joi.array().allow(null),
            must: Joi.array().allow(null),
            should: Joi.array().allow(null),
            must_not: Joi.array().allow(null),
          }),
        }),
      }),
    }).optional(),
    time: Joi.object({
      from: Joi.string(),
      interval: Joi.string().required(),
      timezone: Joi.string().required(),
      to: Joi.string(),
    }).required(),
  }),
};

export function runRoute(server: Legacy.Server) {
  server.route({
    method: 'POST',
    path: '/api/timelion/run',
    options: {
      validate: requestPayload,
    },
    handler: async (request: Legacy.Request & TimelionRequestQuery, h: Legacy.ResponseToolkit) => {
      try {
        const uiSettings = await request.getUiSettingsService().getAll();

        const tlConfig = getTlConfig({
          server,
          request,
          settings: _.defaults(uiSettings, timelionDefaults), // Just in case they delete some setting.
        });
        const chainRunner = chainRunnerFn(tlConfig);
        const sheet = await Bluebird.all(chainRunner.processRequest(request.payload));

        return {
          sheet,
          stats: chainRunner.getStats(),
        };
      } catch (err) {
        server.log(['timelion', 'error'], `${err.toString()}: ${err.stack}`);
        // TODO Maybe we should just replace everywhere we throw with Boom? Probably.
        if (err.isBoom) {
          return err;
        } else {
          return formatErrorResponse(err, h);
        }
      }
    },
  });
}
