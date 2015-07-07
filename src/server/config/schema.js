var Joi = require('joi');
var fs = require('fs');
var path = require('path');
var package = require('../utils/closestPackageJson').getSync();
var fromRoot = require('../utils/fromRoot');

module.exports = Joi.object({
  env: Joi.object({
    name: Joi.string().default(Joi.ref('$env')),
    dev: Joi.boolean().default(Joi.ref('$dev')),
    prod: Joi.boolean().default(Joi.ref('$prod'))
  }).default(),

  kibana: Joi.object({
    package: Joi.any().default(package),
    server: Joi.object({
      host: Joi.string().hostname().default('0.0.0.0'),
      port: Joi.number().default(5601),
      maxSockets: Joi.any().default(Infinity),
      pidFile: Joi.string(),
      root: Joi.string().default(path.normalize(path.join(__dirname, '..'))),
      ssl: Joi.object({
        cert: Joi.string(),
        key: Joi.string()
      }).default()
    }).default(),
    index: Joi.string().default('.kibana'),

    defaultRoute: Joi.string().default('/app/kibana/'),
    buildNum: Joi.string().default('@@buildNum'),
    bundledPluginIds: Joi.array().items(Joi.string())
  }).default(),

  elasticsearch: Joi.object({
    url: Joi.string().uri({ scheme: ['http', 'https'] }).default('http://localhost:9200'),
    preserveHost: Joi.boolean().default(true),
    username: Joi.string(),
    password: Joi.string(),
    shardTimeout: Joi.number().default(0),
    requestTimeout: Joi.number().default(30000),
    pingTimeout: Joi.number().default(30000),
    startupTimeout: Joi.number().default(5000),
    ssl: Joi.object({
      verify: Joi.boolean().default(true),
      ca: Joi.string(),
      cert: Joi.string(),
      key: Joi.string()
    }).default(),
    minimumVerison: Joi.string().default('1.4.4')
  }).default(),

  logging: Joi.object({
    quiet: Joi.boolean().default(false),

    // not nested under a kbnLogger key so that we can ref "quiet"
    kbnLogger: Joi.boolean().default(true),
    kbnLoggerConfig: Joi.object({
      dest: Joi.string().default('stdout'),
      json: Joi.boolean().default(Joi.ref('$prod'))
    }).default(),
    kbnLoggerEvents: Joi.when('quiet', {
      is: true,
      then: Joi.object({
        error: Joi.string().default('*')
      }).default(),
      otherwise: Joi.object({
        log: Joi.string().default('*'),
        response: Joi.string().default('*'),
        error: Joi.string().default('*')
      }).default()
    })
  }).default(),

  plugins: Joi.object({
    paths: Joi.array().items(Joi.string()).default([]),
    scanDirs: Joi.array().items(Joi.string()).default([])
  }),

  optimize: Joi.object({
    bundleDir: Joi.string().default(fromRoot('src/server/optimize/bundles')),
    viewCaching: Joi.boolean().default(Joi.ref('$prod')),
    watch: Joi.boolean().default(Joi.ref('$dev')),
    sourceMaps: Joi.boolean().default(Joi.ref('$dev'))
  })

}).default();

