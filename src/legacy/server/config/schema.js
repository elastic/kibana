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

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { fromRoot } from '../../../core/server/utils';
import {
  DEFAULT_CSP_RULES,
  DEFAULT_CSP_STRICT,
  DEFAULT_CSP_WARN_LEGACY_BROWSERS,
} from '../csp';

const HANDLED_IN_NEW_PLATFORM = Joi.any().description('This key is handled in the new platform ONLY');
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
    strict: Joi.boolean().default(DEFAULT_CSP_STRICT),
    warnLegacyBrowsers: Joi.boolean().default(DEFAULT_CSP_WARN_LEGACY_BROWSERS),
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
    defaultRoute: Joi.string().regex(/^\//, `start with a slash`),
    customResponseHeaders: Joi.object().unknown(true).default({}),
    xsrf: Joi.object({
      disableProtection: Joi.boolean().default(false),
      whitelist: Joi.array().items(
        Joi.string().regex(/^\//, 'start with a slash')
      ).default([]),
      token: Joi.string().optional().notes('Deprecated')
    }).default(),

    // keep them for BWC, remove when not used in Legacy.
    // validation should be in sync with one in New platform.
    // https://github.com/elastic/kibana/blob/master/src/core/server/http/http_config.ts
    basePath: Joi.string().default('').allow('').regex(/(^$|^\/.*[^\/]$)/, `start with a slash, don't end with one`),
    host: Joi.string().hostname().default('localhost'),
    port: Joi.number().default(5601),
    rewriteBasePath: Joi.boolean().when('basePath', {
      is: '',
      then: Joi.default(false).valid(false),
      otherwise: Joi.default(false),
    }),

    autoListen: HANDLED_IN_NEW_PLATFORM,
    cors: HANDLED_IN_NEW_PLATFORM,
    keepaliveTimeout: HANDLED_IN_NEW_PLATFORM,
    maxPayloadBytes: HANDLED_IN_NEW_PLATFORM,
    socketTimeout: HANDLED_IN_NEW_PLATFORM,
    ssl: HANDLED_IN_NEW_PLATFORM,
    compression: HANDLED_IN_NEW_PLATFORM,
  }).default(),

  uiSettings: HANDLED_IN_NEW_PLATFORM,

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

    timezone: Joi.string().allow(false).default('UTC'),
    rotate: Joi.object().keys({
      enabled: Joi.boolean().default(false),
      everyBytes: Joi.number().greater(1024).default(10485760),
      keepFiles: Joi.number().greater(2).less(1024).default(7),
      pollingInterval: Joi.number().greater(5000).less(3600000).default(10000),
      usePolling: Joi.boolean().default(false)
    }).default()
  }).default(),

  ops: Joi.object({
    interval: Joi.number().default(5000),
  }).default(),

  plugins: Joi.object({
    paths: Joi.array().items(Joi.string()).default([]),
    scanDirs: Joi.array().items(Joi.string()).default([]),
    initialize: Joi.boolean().default(true)
  }).default(),

  path: HANDLED_IN_NEW_PLATFORM,

  stats: Joi.object({
    maximumWaitTimeForAllCollectorsInS: Joi.number().default(60)
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
    workers: Joi.number().min(1),
    profile: Joi.boolean().default(false)
  }).default(),
  status: Joi.object({
    allowAnonymous: Joi.boolean().default(false)
  }).default(),
  map: Joi.object({
    includeElasticMapsService: Joi.boolean().default(true),
    proxyElasticMapsServiceInMaps: Joi.boolean().default(false),
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
    manifestServiceUrl: Joi.string().default('https://catalogue.maps.elastic.co/v7.2/manifest'),
    emsLandingPageUrl: Joi.string().default('https://maps.elastic.co/v7.4'),
    emsFontLibraryUrl: Joi.string().default('https://tiles.maps.elastic.co/fonts/{fontstack}/{range}.pbf'),
    emsTileLayerId: Joi.object({
      bright: Joi.string().default('road_map'),
      desaturated: Joi.string().default('road_map_desaturated'),
      dark: Joi.string().default('dark_map'),
    }).default({
      bright: 'road_map',
      desaturated: 'road_map_desaturated',
      dark: 'dark_map',
    })
  }).default(),

  i18n: Joi.object({
    locale: Joi.string().default('en'),
  }).default(),

  savedObjects: Joi.object({
    maxImportPayloadBytes: Joi.number().default(10485760),
    maxImportExportSize: Joi.number().default(10000),
  }).default(),

}).default();
