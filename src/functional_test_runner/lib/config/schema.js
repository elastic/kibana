import { resolve, dirname } from 'path';

import Joi from 'joi';

// valid pattern for ID
// enforced camel-case identifiers for consistency
const ID_PATTERN = /^[a-zA-Z0-9_]+$/;
const INSPECTING = (
  process.execArgv.includes('--inspect') ||
  process.execArgv.includes('--inspect-brk')
);

const urlPartsSchema = () => Joi.object().keys({
  protocol: Joi.string().valid('http', 'https').default('http'),
  hostname: Joi.string().hostname().default('localhost'),
  port: Joi.number(),
  auth: Joi.string().regex(/^[^:]+:.+$/, 'username and password seperated by a colon'),
  username: Joi.string(),
  password: Joi.string(),
  pathname: Joi.string().regex(/^\//, 'start with a /'),
  hash: Joi.string().regex(/^\//, 'start with a /')
}).default();

const appUrlPartsSchema = () => Joi.object().keys({
  pathname: Joi.string().regex(/^\//, 'start with a /'),
  hash: Joi.string().regex(/^\//, 'start with a /')
}).default();

const defaultRelativeToConfigPath = path => {
  const makeDefault = (locals, options) => (
    resolve(dirname(options.context.path), path)
  );
  makeDefault.description = `<config.js directory>/${path}`;
  return makeDefault;
};

export const schema = Joi.object().keys({
  testFiles: Joi.array().items(Joi.string()).when('$primary', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.default([]),
  }),

  services: Joi.object().pattern(
    ID_PATTERN,
    Joi.func().required()
  ).default(),

  pageObjects: Joi.object().pattern(
    ID_PATTERN,
    Joi.func().required()
  ).default(),

  timeouts: Joi.object().keys({
    find: Joi.number().default(10000),
    try: Joi.number().default(40000),
    esRequestTimeout: Joi.number().default(30000),
    kibanaStabilize: Joi.number().default(15000),
    navigateStatusPageCheck: Joi.number().default(250),
  }).default(),

  mochaOpts: Joi.object().keys({
    bail: Joi.boolean().default(false),
    grep: Joi.string(),
    invert: Joi.boolean().default(false),
    slow: Joi.number().default(30000),
    timeout: Joi.number().default(INSPECTING ? Infinity : 180000),
    ui: Joi.string().default('bdd'),
  }).default(),

  updateBaselines: Joi.boolean().default(false),

  junit: Joi.object().keys({
    enabled: Joi.boolean().default(!!process.env.CI),
    reportName: Joi.string(),
    rootDirectory: Joi.string(),
  }).default(),

  users: Joi.object().pattern(
    ID_PATTERN,
    Joi.object().keys({
      username: Joi.string().required(),
      password: Joi.string().required(),
    }).required()
  ),

  servers: Joi.object().keys({
    kibana: urlPartsSchema(),
    elasticsearch: urlPartsSchema(),
  }).default(),

  esTestCluster: Joi.object().keys({
    license: Joi.string().default('oss'),
    from: Joi.string().default('snapshot'),
    serverArgs: Joi.array(),
  }).default(),

  kbnTestServer: Joi.object().keys({
    buildArgs: Joi.array(),
    sourceArgs: Joi.array(),
    serverArgs: Joi.array(),
  }).default(),

  // env allows generic data, but should be removed
  env: Joi.object().default(),

  chromedriver: Joi.object().keys({
    url: Joi.string().uri({ scheme: /https?/ }).default('http://localhost:9515')
  }).default(),

  // definition of apps that work with `common.navigateToApp()`
  apps: Joi.object().pattern(
    ID_PATTERN,
    appUrlPartsSchema()
  ).default(),

  // settings for the esArchiver module
  esArchiver: Joi.object().keys({
    directory: Joi.string().default(defaultRelativeToConfigPath('fixtures/es_archiver'))
  }).default(),

  // settings for the screenshots module
  screenshots: Joi.object().keys({
    directory: Joi.string().default(defaultRelativeToConfigPath('screenshots'))
  }).default(),

  // settings for the failureDebugging module
  failureDebugging: Joi.object().keys({
    htmlDirectory: Joi.string().default(defaultRelativeToConfigPath('failure_debug/html'))
  }).default(),
}).default();
