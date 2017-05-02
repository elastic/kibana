import Joi from 'joi';

import { ConsoleReporterProvider } from '../reporters';

// valid pattern for ID
// enforced camel-case identifiers for consistency
const ID_PATTERN = /^[a-zA-Z0-9_]+$/;
const INSPECTING = process.execArgv.includes('--inspect');

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

export const schema = Joi.object().keys({
  testFiles: Joi.array().items(Joi.string()).required(),

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
    test: Joi.number().default(INSPECTING ? Infinity : 120000),
    esRequestTimeout: Joi.number().default(30000),
    kibanaStabilize: Joi.number().default(15000),
    navigateStatusPageCheck: Joi.number().default(250),
  }).default(),

  mochaOpts: Joi.object().keys({
    bail: Joi.boolean().default(false),
    grep: Joi.string(),
    slow: Joi.number().default(30000),
    timeout: Joi.number().default(60000),
    ui: Joi.string().default('bdd'),
    reporterProvider: Joi.func().default(ConsoleReporterProvider),
  }).default(),

  users: Joi.object().pattern(
    ID_PATTERN,
    Joi.object().keys({
      username: Joi.string().required(),
      password: Joi.string().required(),
    }).required()
  ),

  servers: Joi.object().keys({
    webdriver: urlPartsSchema(),
    kibana: urlPartsSchema(),
    elasticsearch: urlPartsSchema(),
  }).default(),

  // definition of apps that work with `common.navigateToApp()`
  apps: Joi.object().pattern(
    ID_PATTERN,
    urlPartsSchema()
  ).default(),

  // settings for the esArchiver module
  esArchiver: Joi.object().keys({
    directory: Joi.string().required()
  }),

  // settings for the screenshots module
  screenshots: Joi.object().keys({
    directory: Joi.string().required()
  }),
}).default();
