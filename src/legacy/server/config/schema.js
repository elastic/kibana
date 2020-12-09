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
import os from 'os';
import { legacyLoggingConfigSchema } from '@kbn/legacy-logging';

const HANDLED_IN_NEW_PLATFORM = Joi.any().description(
  'This key is handled in the new platform ONLY'
);
export default () =>
  Joi.object({
    elastic: Joi.object({
      apm: HANDLED_IN_NEW_PLATFORM,
    }).default(),

    pkg: Joi.object({
      version: Joi.string().default(Joi.ref('$version')),
      branch: Joi.string().default(Joi.ref('$branch')),
      buildNum: Joi.number().default(Joi.ref('$buildNum')),
      buildSha: Joi.string().default(Joi.ref('$buildSha')),
    }).default(),

    env: Joi.object({
      name: Joi.string().default(Joi.ref('$env')),
      dev: Joi.boolean().default(Joi.ref('$dev')),
      prod: Joi.boolean().default(Joi.ref('$prod')),
    }).default(),

    dev: HANDLED_IN_NEW_PLATFORM,
    pid: HANDLED_IN_NEW_PLATFORM,
    csp: HANDLED_IN_NEW_PLATFORM,

    server: Joi.object({
      name: Joi.string().default(os.hostname()),
      // keep them for BWC, remove when not used in Legacy.
      // validation should be in sync with one in New platform.
      // https://github.com/elastic/kibana/blob/master/src/core/server/http/http_config.ts
      basePath: Joi.string()
        .default('')
        .allow('')
        .regex(/(^$|^\/.*[^\/]$)/, `start with a slash, don't end with one`),
      host: Joi.string().hostname().default('localhost'),
      port: Joi.number().default(5601),
      rewriteBasePath: Joi.boolean().when('basePath', {
        is: '',
        then: Joi.default(false).valid(false),
        otherwise: Joi.default(false),
      }),

      autoListen: HANDLED_IN_NEW_PLATFORM,
      cors: HANDLED_IN_NEW_PLATFORM,
      customResponseHeaders: HANDLED_IN_NEW_PLATFORM,
      keepaliveTimeout: HANDLED_IN_NEW_PLATFORM,
      maxPayloadBytes: HANDLED_IN_NEW_PLATFORM,
      publicBaseUrl: HANDLED_IN_NEW_PLATFORM,
      socketTimeout: HANDLED_IN_NEW_PLATFORM,
      ssl: HANDLED_IN_NEW_PLATFORM,
      compression: HANDLED_IN_NEW_PLATFORM,
      uuid: HANDLED_IN_NEW_PLATFORM,
      xsrf: HANDLED_IN_NEW_PLATFORM,
    }).default(),

    uiSettings: HANDLED_IN_NEW_PLATFORM,

    logging: legacyLoggingConfigSchema,

    ops: Joi.object({
      interval: Joi.number().default(5000),
      cGroupOverrides: HANDLED_IN_NEW_PLATFORM,
    }).default(),

    plugins: HANDLED_IN_NEW_PLATFORM,
    path: HANDLED_IN_NEW_PLATFORM,
    stats: HANDLED_IN_NEW_PLATFORM,
    status: HANDLED_IN_NEW_PLATFORM,
    map: HANDLED_IN_NEW_PLATFORM,
    i18n: HANDLED_IN_NEW_PLATFORM,

    // temporarily moved here from the (now deleted) kibana legacy plugin
    kibana: Joi.object({
      enabled: Joi.boolean().default(true),
      index: Joi.string().default('.kibana'),
      autocompleteTerminateAfter: Joi.number().integer().min(1).default(100000),
      // TODO Also allow units here like in elasticsearch config once this is moved to the new platform
      autocompleteTimeout: Joi.number().integer().min(1).default(1000),
    }).default(),

    savedObjects: HANDLED_IN_NEW_PLATFORM,
  }).default();
