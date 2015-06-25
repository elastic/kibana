var Joi = require('joi');
var fs = require('fs');
var path = require('path');

module.exports = Joi.object({
  kibana: Joi.object({
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
    pluginPaths: Joi.array().items(Joi.string()).default([]),
    pluginScanDirs: Joi.array().items(Joi.string()).default([]),
    defaultAppId: Joi.string().default('kibana'),
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
    file: Joi.string(),
    console: Joi.object({
      ops: Joi.any(),
      log: Joi.any().default('*'),
      response: Joi.any().default('*'),
      error: Joi.any().default('*'),
      json: Joi.boolean().default(false),
    }).default()
  }).default(),
}).default();

