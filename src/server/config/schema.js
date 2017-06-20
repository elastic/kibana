import Joi from 'joi';
import { constants as cryptoConstants } from 'crypto';
import os from 'os';

import { fromRoot } from '../../utils';
import { getData } from '../path';

module.exports = () => Joi.object({
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
    ssl: Joi.object({
      enabled: Joi.boolean().default(false),
      certificate: Joi.string().when('enabled', {
        is: true,
        then: Joi.required(),
      }),
      key: Joi.string().when('enabled', {
        is: true,
        then: Joi.required()
      }),
      keyPassphrase: Joi.string(),
      certificateAuthorities: Joi.array().single().items(Joi.string()),
      supportedProtocols: Joi.array().items(Joi.string().valid('TLSv1', 'TLSv1.1', 'TLSv1.2')),
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
      token: Joi.string().optional().notes('Deprecated')
    }).default(),
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
    })
  })
  .default(),

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

  optimize: Joi.object({
    enabled: Joi.boolean().default(true),
    bundleFilter: Joi.string().default('!tests'),
    bundleDir: Joi.string().default(fromRoot('optimize/bundles')),
    viewCaching: Joi.boolean().default(Joi.ref('$prod')),
    lazy: Joi.boolean().default(false),
    lazyPort: Joi.number().default(5602),
    lazyHost: Joi.string().hostname().default('localhost'),
    lazyPrebuild: Joi.boolean().default(false),
    lazyProxyTimeout: Joi.number().default(5 * 60000),
    useBundleCache: Joi.boolean().default(Joi.ref('$prod')),
    unsafeCache: Joi.when('$prod', {
      is: true,
      then: Joi.boolean().valid(false),
      otherwise: Joi
        .alternatives()
        .try(
          Joi.boolean(),
          Joi.string().regex(/^\/.+\/$/)
        )
        .default(true),
    }),
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
    allowAnonymous: Joi.boolean().default(false),
    v6ApiFormat: Joi.boolean().default(false)
  }).default(),
  map: Joi.object({
    manifestServiceUrl: Joi.when('$dev', {
      is: true,
      then: Joi.string().default('https://catalogue.maps.elastic.co/v1/manifest'),
      otherwise: Joi.string().default('https://catalogue.maps.elastic.co/v1/manifest')
    })
  }).default(),
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
      bounds: Joi.array().items(Joi.array().items(Joi.number()).min(2).required()).min(2)
    }).default()
  }).default(),
  regionmap: Joi.object({
    layers: Joi.array().items(Joi.object({
      url: Joi.string(),
      type: Joi.string(),
      name: Joi.string(),
      fields: Joi.array().items(Joi.object({
        name: Joi.string(),
        description: Joi.string()
      }))
    }))
  }).default(),
  uiSettings: Joi.object({
    // this is used to prevent the uiSettings from initializing. Since they
    // require the elasticsearch plugin in order to function we need to turn
    // them off when we turn off the elasticsearch plugin (like we do in the
    // optimizer half of the dev server)
    enabled: Joi.boolean().default(true)
  }).default(),

  i18n: Joi.object({
    defaultLocale: Joi.string().default('en'),
  }).default(),

}).default();
