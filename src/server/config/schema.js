var Joi = require('joi');
var fs = require('fs');
var path = require('path');
var package = require('../../utils/closestPackageJson').getSync();
var fromRoot = require('../../utils/fromRoot');

module.exports = Joi.object({
  env: Joi.object({
    name: Joi.string().default(Joi.ref('$env')),
    dev: Joi.boolean().default(Joi.ref('$dev')),
    prod: Joi.boolean().default(Joi.ref('$prod'))
  }).default(),

  server: Joi.object({
    host: Joi.string().hostname().default('0.0.0.0'),
    port: Joi.number().default(5601),
    defaultRoute: Joi.string(),
    pidFile: Joi.string(),
    ssl: Joi.object({
      cert: Joi.string(),
      key: Joi.string()
    }).default()
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

    dest: Joi.string().default('stdout'),
    json: Joi.boolean().default(Joi.ref('$prod')),

    events: Joi.any().default({})
  })
  .default(),

  plugins: Joi.object({
    paths: Joi.array().items(Joi.string()).default([]),
    scanDirs: Joi.array().items(Joi.string()).default([])
  }).default(),

  optimize: Joi.object({
    bundleDir: Joi.string().default(fromRoot('optimize/bundles')),
    viewCaching: Joi.boolean().default(Joi.ref('$prod')),
    watch: Joi.boolean().default(Joi.ref('$dev')),
    sourceMaps: Joi.boolean().default(Joi.ref('$dev'))
  }).default()

}).default();

