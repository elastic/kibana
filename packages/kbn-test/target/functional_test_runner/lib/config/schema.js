"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.schema = void 0;

var _path = require("path");

var _joi = _interopRequireDefault(require("joi"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
// valid pattern for ID
// enforced camel-case identifiers for consistency
const ID_PATTERN = /^[a-zA-Z0-9_]+$/;
const INSPECTING = process.execArgv.includes('--inspect') || process.execArgv.includes('--inspect-brk');

const urlPartsSchema = () => _joi.default.object().keys({
  protocol: _joi.default.string().valid('http', 'https').default('http'),
  hostname: _joi.default.string().hostname().default('localhost'),
  port: _joi.default.number(),
  auth: _joi.default.string().regex(/^[^:]+:.+$/, 'username and password separated by a colon'),
  username: _joi.default.string(),
  password: _joi.default.string(),
  pathname: _joi.default.string().regex(/^\//, 'start with a /'),
  hash: _joi.default.string().regex(/^\//, 'start with a /')
}).default();

const appUrlPartsSchema = () => _joi.default.object().keys({
  pathname: _joi.default.string().regex(/^\//, 'start with a /'),
  hash: _joi.default.string().regex(/^\//, 'start with a /')
}).default();

const defaultRelativeToConfigPath = path => {
  const makeDefault = (_, options) => (0, _path.resolve)((0, _path.dirname)(options.context.path), path);

  makeDefault.description = `<config.js directory>/${path}`;
  return makeDefault;
};

const schema = _joi.default.object().keys({
  testFiles: _joi.default.array().items(_joi.default.string()).when('$primary', {
    is: true,
    then: _joi.default.required(),
    otherwise: _joi.default.any().default([])
  }),
  excludeTestFiles: _joi.default.array().items(_joi.default.string()).default([]),
  suiteTags: _joi.default.object().keys({
    include: _joi.default.array().items(_joi.default.string()).default([]),
    exclude: _joi.default.array().items(_joi.default.string()).default([])
  }).default(),
  services: _joi.default.object().pattern(ID_PATTERN, _joi.default.func().required()).default(),
  pageObjects: _joi.default.object().pattern(ID_PATTERN, _joi.default.func().required()).default(),
  timeouts: _joi.default.object().keys({
    find: _joi.default.number().default(10000),
    try: _joi.default.number().default(120000),
    waitFor: _joi.default.number().default(20000),
    esRequestTimeout: _joi.default.number().default(30000),
    kibanaStabilize: _joi.default.number().default(15000),
    navigateStatusPageCheck: _joi.default.number().default(250),
    // Many of our tests use the `exists` functions to determine where the user is. For
    // example, you'll see a lot of code like:
    // if (!testSubjects.exists('someElementOnPageA')) {
    //   navigateToPageA();
    // }
    // If the element doesn't exist, selenium would wait up to defaultFindTimeout for it to
    // appear. Because there are many times when we expect it to not be there, we don't want
    // to wait the full amount of time, or it would greatly slow our tests down. We used to have
    // this value at 1 second, but this caused flakiness because sometimes the element was deemed missing
    // only because the page hadn't finished loading.
    // The best path forward it to prefer functions like `testSubjects.existOrFail` or
    // `testSubjects.missingOrFail` instead of just the `exists` checks, and be deterministic about
    // where your user is and what they should click next.
    waitForExists: _joi.default.number().default(2500)
  }).default(),
  mochaOpts: _joi.default.object().keys({
    bail: _joi.default.boolean().default(false),
    grep: _joi.default.string(),
    invert: _joi.default.boolean().default(false),
    slow: _joi.default.number().default(30000),
    timeout: _joi.default.number().default(INSPECTING ? 360000 * 100 : 360000),
    ui: _joi.default.string().default('bdd')
  }).default(),
  updateBaselines: _joi.default.boolean().default(false),
  browser: _joi.default.object().keys({
    type: _joi.default.string().valid('chrome', 'firefox').default('chrome'),
    logPollingMs: _joi.default.number().default(100)
  }).default(),
  junit: _joi.default.object().keys({
    enabled: _joi.default.boolean().default(!!process.env.CI),
    reportName: _joi.default.string()
  }).default(),
  mochaReporter: _joi.default.object().keys({
    captureLogOutput: _joi.default.boolean().default(!!process.env.CI)
  }).default(),
  users: _joi.default.object().pattern(ID_PATTERN, _joi.default.object().keys({
    username: _joi.default.string().required(),
    password: _joi.default.string().required()
  }).required()),
  servers: _joi.default.object().keys({
    kibana: urlPartsSchema(),
    elasticsearch: urlPartsSchema()
  }).default(),
  esTestCluster: _joi.default.object().keys({
    license: _joi.default.string().default('oss'),
    from: _joi.default.string().default('snapshot'),
    serverArgs: _joi.default.array(),
    serverEnvVars: _joi.default.object(),
    dataArchive: _joi.default.string(),
    ssl: _joi.default.boolean().default(false)
  }).default(),
  kbnTestServer: _joi.default.object().keys({
    buildArgs: _joi.default.array(),
    sourceArgs: _joi.default.array(),
    serverArgs: _joi.default.array()
  }).default(),
  chromedriver: _joi.default.object().keys({
    url: _joi.default.string().uri({
      scheme: /https?/
    }).default('http://localhost:9515')
  }).default(),
  firefoxdriver: _joi.default.object().keys({
    url: _joi.default.string().uri({
      scheme: /https?/
    }).default('http://localhost:2828')
  }).default(),
  // definition of apps that work with `common.navigateToApp()`
  apps: _joi.default.object().pattern(ID_PATTERN, appUrlPartsSchema()).default(),
  // settings for the esArchiver module
  esArchiver: _joi.default.object().keys({
    directory: _joi.default.string().default(defaultRelativeToConfigPath('fixtures/es_archiver'))
  }).default(),
  // settings for the kibanaServer.uiSettings module
  uiSettings: _joi.default.object().keys({
    defaults: _joi.default.object().unknown(true)
  }).default(),
  // settings for the screenshots module
  screenshots: _joi.default.object().keys({
    directory: _joi.default.string().default(defaultRelativeToConfigPath('screenshots'))
  }).default(),
  // settings for the snapshots module
  snapshots: _joi.default.object().keys({
    directory: _joi.default.string().default(defaultRelativeToConfigPath('snapshots'))
  }).default(),
  // settings for the failureDebugging module
  failureDebugging: _joi.default.object().keys({
    htmlDirectory: _joi.default.string().default(defaultRelativeToConfigPath('failure_debug/html'))
  }).default(),
  // settings for the find service
  layout: _joi.default.object().keys({
    fixedHeaderHeight: _joi.default.number().default(50)
  }).default()
}).default();

exports.schema = schema;