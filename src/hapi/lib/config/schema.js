var Joi = require('joi');
var fs = require('fs');
var path = require('path');
var checkPath = require('./check_path');
var packagePath = path.resolve(__dirname, '..', '..', 'package.json');

// Check if the local public folder is present. This means we are running in
// the NPM module. If it's not there then we are running in the git root.
var publicFolder = path.resolve(__dirname, '..', '..', 'public');
if (!checkPath(publicFolder)) publicFolder = path.resolve(__dirname, '..', '..', '..', 'kibana');

try {
  fs.statSync(packagePath);
} catch (err) {
  packagePath = path.resolve(__dirname, '..', '..', '..', '..', 'package.json');
}

var bundledPluginsFolder = path.resolve(publicFolder, 'plugins');


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
    publicFolder: Joi.string().default(publicFolder),
    externalPluginsFolder: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()),
    bundledPluginsFolder: Joi.string().default(bundledPluginsFolder),
    defaultAppId: Joi.string().default('discover'),
    package: Joi.any().default(require(packagePath)),
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

