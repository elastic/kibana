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
      socketTimeout: HANDLED_IN_NEW_PLATFORM,
      ssl: HANDLED_IN_NEW_PLATFORM,
      compression: HANDLED_IN_NEW_PLATFORM,
      uuid: HANDLED_IN_NEW_PLATFORM,
      xsrf: HANDLED_IN_NEW_PLATFORM,
    }).default(),

    uiSettings: HANDLED_IN_NEW_PLATFORM,

    logging: Joi.object()
      .keys({
        appenders: HANDLED_IN_NEW_PLATFORM,
        loggers: HANDLED_IN_NEW_PLATFORM,
        root: HANDLED_IN_NEW_PLATFORM,

        silent: Joi.boolean().default(false),

        quiet: Joi.boolean().when('silent', {
          is: true,
          then: Joi.default(true).valid(true),
          otherwise: Joi.default(false),
        }),

        verbose: Joi.boolean().when('quiet', {
          is: true,
          then: Joi.valid(false).default(false),
          otherwise: Joi.default(false),
        }),
        events: Joi.any().default({}),
        dest: Joi.string().default('stdout'),
        filter: Joi.any().default({}),
        json: Joi.boolean().when('dest', {
          is: 'stdout',
          then: Joi.default(!process.stdout.isTTY),
          otherwise: Joi.default(true),
        }),

        timezone: Joi.string().allow(false).default('UTC'),
        rotate: Joi.object()
          .keys({
            enabled: Joi.boolean().default(false),
            everyBytes: Joi.number()
              // > 1MB
              .greater(1048576)
              // < 1GB
              .less(1073741825)
              // 10MB
              .default(10485760),
            keepFiles: Joi.number().greater(2).less(1024).default(7),
            pollingInterval: Joi.number().greater(5000).less(3600000).default(10000),
            usePolling: Joi.boolean().default(false),
          })
          .default(),
      })
      .default(),

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
