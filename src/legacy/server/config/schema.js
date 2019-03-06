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
import {
  constants as cryptoConstants
} from 'crypto';
import os from 'os';

import {
  fromRoot
} from '../../utils';
import {
  getData
} from '../path';
import { DEFAULT_CSP_RULES } from '../csp';

export default () => Joi.object({
  pkg: Joi.object({
    version: Joi.string().default(Joi.ref('$version')),
    branch: Joi.string().default(Joi.ref('$branch')),
    buildNum: Joi.number().default(Joi.ref('$buildNum')),
    buildSha: Joi.string().default(Joi.ref('$buildSha')),
  }).default(),

  env: Joi.object({
    name: Joi.string().default(Joi.ref('$env')),
    dev: Joi.boolean().default(Joi.ref('$dev')),
    prod: Joi.boolean().default(Joi.ref('$prod'))
  }).default(),

  dev: Joi.object({
    basePathProxyTarget: Joi.number().default(5603),
  }).default(),

  pid: Joi.object({
    file: Joi.string(),
    exclusive: Joi.boolean().default(false)
  }).default(),

  csp: Joi.object({
    rules: Joi.array().items(Joi.string()).default(DEFAULT_CSP_RULES),
    strict: Joi.boolean().default(false),
    warnLegacyBrowsers: Joi.boolean().default(true),
  }).default(),

  cpu: Joi.object({
    cgroup: Joi.object({
      path: Joi.object({
        override: Joi.string().default()
      })
    })
  }),

  cpuacct: Joi.object({
    cgroup: Joi.object({
      path: Joi.object({
        override: Joi.string().default()
      })
    })
  }),

  server: Joi.object({
    uuid: Joi.string().guid().default(),
    name: Joi.string().default(os.hostname()),
    host: Joi.string().hostname().default('localhost'),
    port: Joi.number().default(5601),
    maxPayloadBytes: Joi.number().default(1048576),
    autoListen: Joi.boolean().default(true),
    defaultRoute: Joi.string().default('/app/kibana').regex(/^\//, `start with a slash`),
    basePath: Joi.string().default('').allow('').regex(/(^$|^\/.*[^\/]$)/, `start with a slash, don't end with one`),
    rewriteBasePath: Joi.boolean().when('basePath', {
      is: '',
      then: Joi.default(false).valid(false),
      otherwise: Joi.default(false),
    }),
    customResponseHeaders: Joi.object().unknown(true).default({}),
    ssl: Joi.object({
      enabled: Joi.boolean().default(false),
      redirectHttpFromPort: Joi.number(),
      certificate: Joi.string().when('enabled', {
        is: true,
        then: Joi.required(),
      }),
      key: Joi.string().when('enabled', {
        is: true,
        then: Joi.required()
      }),
      keyPassphrase: Joi.string(),
      certificateAuthorities: Joi.array().single().items(Joi.string()).default([]),
      supportedProtocols: Joi.array().items(Joi.string().valid('TLSv1', 'TLSv1.1', 'TLSv1.2')).default(['TLSv1.1', 'TLSv1.2']),
      cipherSuites: Joi.array().items(Joi.string()).default(cryptoConstants.defaultCoreCipherList.split(':'))
    }).default(),
    cors: Joi.when('$dev', {
      is: true,
      then: Joi.object().default({
        origin: ['*://localhost:9876'] // karma test server
      }),
      otherwise: Joi.boolean().default(false)
    }),
    xsrf: Joi.object({
      disableProtection: Joi.boolean().default(false),
      whitelist: Joi.array().items(
        Joi.string().regex(/^\//, 'start with a slash')
      ).default([]),
      token: Joi.string().optional().notes('Deprecated')
    }).default(),
  }).default(),

  uiSettings: Joi.object().keys({
    overrides: Joi.object().unknown(true).default()
  }).default(),

  logging: Joi.object().keys({
    silent: Joi.boolean().default(false),

    quiet: Joi.boolean()
      .when('silent', {
        is: true,
        then: Joi.default(true).valid(true),
        otherwise: Joi.default(false)
      }),

    verbose: Joi.boolean()
      .when('quiet', {
        is: true,
        then: Joi.valid(false).default(false),
        otherwise: Joi.default(false)
      }),
    events: Joi.any().default({}),
    dest: Joi.string().default('stdout'),
    filter: Joi.any().default({}),
    json: Joi.boolean()
      .when('dest', {
        is: 'stdout',
        then: Joi.default(!process.stdout.isTTY),
        otherwise: Joi.default(true)
      }),
    timezone: Joi.string().allow(false).default('UTC')
  }).default(),

  ops: Joi.object({
    interval: Joi.number().default(5000),
  }).default(),

  plugins: Joi.object({
    paths: Joi.array().items(Joi.string()).default([]),
    scanDirs: Joi.array().items(Joi.string()).default([]),
    initialize: Joi.boolean().default(true)
  }).default(),

  path: Joi.object({
    data: Joi.string().default(getData())
  }).default(),

  migrations: Joi.object({
    batchSize: Joi.number().default(100),
    scrollDuration: Joi.string().default('15m'),
    pollInterval: Joi.number().default(1500),
  }).default(),

  optimize: Joi.object({
    enabled: Joi.boolean().default(true),
    bundleFilter: Joi.string().default('!tests'),
    bundleDir: Joi.string().default(fromRoot('optimize/bundles')),
    viewCaching: Joi.boolean().default(Joi.ref('$prod')),
    watch: Joi.boolean().default(false),
    watchPort: Joi.number().default(5602),
    watchHost: Joi.string().hostname().default('localhost'),
    watchPrebuild: Joi.boolean().default(false),
    watchProxyTimeout: Joi.number().default(5 * 60000),
    useBundleCache: Joi.boolean().default(Joi.ref('$prod')),
    sourceMaps: Joi.when('$prod', {
      is: true,
      then: Joi.boolean().valid(false),
      otherwise: Joi
        .alternatives()
        .try(
          Joi.string().required(),
          Joi.boolean()
        )
        .default('#cheap-source-map'),
    }),
    profile: Joi.boolean().default(false)
  }).default(),
  status: Joi.object({
    allowAnonymous: Joi.boolean().default(false)
  }).default(),
  map: Joi.object({
    includeElasticMapsService: Joi.boolean().default(true),
    tilemap: Joi.object({
      url: Joi.string(),
      options: Joi.object({
        attribution: Joi.string(),
        minZoom: Joi.number().min(0, 'Must be 0 or higher').default(0),
        maxZoom: Joi.number().default(10),
        tileSize: Joi.number(),
        subdomains: Joi.array().items(Joi.string()).single(),
        errorTileUrl: Joi.string().uri(),
        tms: Joi.boolean(),
        reuseTiles: Joi.boolean(),
        bounds: Joi.array().items(Joi.array().items(Joi.number()).min(2).required()).min(2),
        default: Joi.boolean()
      }).default({
        default: true
      })
    }).default(),
    regionmap: Joi.object({
      includeElasticMapsService: Joi.boolean().default(true),
      layers: Joi.array().items(Joi.object({
        url: Joi.string(),
        format: Joi.object({
          type: Joi.string().default('geojson')
        }).default({
          type: 'geojson'
        }),
        meta: Joi.object({
          feature_collection_path: Joi.string().default('data')
        }).default({
          feature_collection_path: 'data'
        }),
        attribution: Joi.string(),
        name: Joi.string(),
        fields: Joi.array().items(Joi.object({
          name: Joi.string(),
          description: Joi.string()
        }))
      })).default([])
    }).default(),
    manifestServiceUrl: Joi.string().default('https://catalogue.maps.elastic.co/v7.0/manifest'),
    emsLandingPageUrl: Joi.string().default('https://maps.elastic.co/v7.0'),
  }).default(),

  i18n: Joi.object({
    locale: Joi.string().default('en'),
  }).default(),

  savedObjects: Joi.object({
    maxImportExportSize: Joi.number().default(10000),
  }).default(),

}).default();
