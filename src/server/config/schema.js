let get = require('lodash').get;
let Joi = require('joi');
let fs = require('fs');
let path = require('path');

let utils = require('requirefrom')('src/utils');
let fromRoot = utils('fromRoot');

module.exports = Joi.object({
  pkg: Joi.object({
    version: Joi.string().default(Joi.ref('$version')),
    buildNum: Joi.number().default(Joi.ref('$buildNum'))
  }).default(),

  env: Joi.object({
    name: Joi.string().default(Joi.ref('$env')),
    dev: Joi.boolean().default(Joi.ref('$dev')),
    prod: Joi.boolean().default(Joi.ref('$prod'))
  }).default(),

  pid: Joi.object({
    file: Joi.string(),
    exclusive: Joi.boolean().default(false)
  }).default(),

  server: Joi.object({
    host: Joi.string().hostname().default('0.0.0.0'),
    port: Joi.number().default(5601),
    autoListen: Joi.boolean().default(true),
    defaultRoute: Joi.string(),
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
    })
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

    json: Joi.boolean()
    .when('dest', {
      is: 'stdout',
      then: Joi.default(!process.stdout.isTTY),
      otherwise: Joi.default(true)
    })
  })
  .default(),

  plugins: Joi.object({
    paths: Joi.array().items(Joi.string()).default([]),
    scanDirs: Joi.array().items(Joi.string()).default([]),
    initialize: Joi.boolean().default(true)
  }).default(),

  optimize: Joi.object({
    enabled: Joi.boolean().default(true),
    bundleFilter: Joi.string().when('tests', {
      is: true,
      then: Joi.default('tests'),
      otherwise: Joi.default('*')
    }),
    bundleDir: Joi.string().default(fromRoot('optimize/bundles')),
    viewCaching: Joi.boolean().default(Joi.ref('$prod')),
    watch: Joi.boolean().default(false),
    lazy: Joi.boolean().when('watch', {
      is: true,
      then: Joi.default(true),
      otherwise: Joi.default(false)
    }),
    lazyPort: Joi.number().default(5602),
    lazyHost: Joi.string().hostname().default('0.0.0.0'),
    lazyPrebuild: Joi.boolean().default(true),
    lazyProxyTimeout: Joi.number().default(5 * 60000),
    sourceMaps: Joi.boolean().default(Joi.ref('$dev')),
    profile: Joi.boolean().default(false),
    tests: Joi.boolean().default(false),
  }).default()

}).default();

