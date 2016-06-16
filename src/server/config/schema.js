import Joi from 'joi';
import fs from 'fs';
import path from 'path';
import { get } from 'lodash';
import { randomBytes } from 'crypto';
import os from 'os';

import { fromRoot } from '../../utils';
import { getData } from '../path';

module.exports = () => Joi.object({
  pkg: Joi.object({
    version: Joi.string().default(Joi.ref('$version')),
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

  uuid: Joi.string().guid().default(),

  server: Joi.object({
    name: Joi.string().default(os.hostname()),
    host: Joi.string().hostname().default('0.0.0.0'),
    port: Joi.number().default(5601),
    maxPayloadBytes: Joi.number().default(1048576),
    autoListen: Joi.boolean().default(true),
    defaultRoute: Joi.string().default('/app/kibana').regex(/^\//, `start with a slash`),
    basePath: Joi.string().default('').allow('').regex(/(^$|^\/.*[^\/]$)/, `start with a slash, don't end with one`),
    ssl: Joi.object({
      cert: Joi.string(),
      key: Joi.string()
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
  }),

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
    unsafeCache: Joi
      .alternatives()
      .try(
        Joi.boolean(),
        Joi.string().regex(/^\/.+\/$/)
      )
      .default('/[\\/\\\\](node_modules|bower_components)[\\/\\\\]/'),
    sourceMaps: Joi
      .alternatives()
      .try(
        Joi.string().required(),
        Joi.boolean()
      )
      .default(Joi.ref('$dev')),
    profile: Joi.boolean().default(false)
  }).default(),

  status: Joi.object({
    allowAnonymous: Joi.boolean().default(false)
  }).default()

}).default();
