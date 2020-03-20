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

import { dirname, resolve } from 'path';

import Joi from 'joi';

// valid pattern for ID
// enforced camel-case identifiers for consistency
const ID_PATTERN = /^[a-zA-Z0-9_]+$/;
const INSPECTING =
  process.execArgv.includes('--inspect') || process.execArgv.includes('--inspect-brk');

const urlPartsSchema = () =>
  Joi.object()
    .keys({
      protocol: Joi.string()
        .valid('http', 'https')
        .default('http'),
      hostname: Joi.string()
        .hostname()
        .default('localhost'),
      port: Joi.number(),
      auth: Joi.string().regex(/^[^:]+:.+$/, 'username and password separated by a colon'),
      username: Joi.string(),
      password: Joi.string(),
      pathname: Joi.string().regex(/^\//, 'start with a /'),
      hash: Joi.string().regex(/^\//, 'start with a /'),
    })
    .default();

const appUrlPartsSchema = () =>
  Joi.object()
    .keys({
      pathname: Joi.string().regex(/^\//, 'start with a /'),
      hash: Joi.string().regex(/^\//, 'start with a /'),
    })
    .default();

const defaultRelativeToConfigPath = (path: string) => {
  const makeDefault: any = (_: any, options: any) => resolve(dirname(options.context.path), path);
  makeDefault.description = `<config.js directory>/${path}`;
  return makeDefault;
};

export const schema = Joi.object()
  .keys({
    testFiles: Joi.array()
      .items(Joi.string())
      .when('$primary', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.any().default([]),
      }),

    suiteFiles: Joi.object()
      .keys({
        include: Joi.array()
          .items(Joi.string())
          .default([]),
        exclude: Joi.array()
          .items(Joi.string())
          .default([]),
      })
      .default(),

    suiteTags: Joi.object()
      .keys({
        include: Joi.array()
          .items(Joi.string())
          .default([]),
        exclude: Joi.array()
          .items(Joi.string())
          .default([]),
      })
      .default(),

    services: Joi.object()
      .pattern(ID_PATTERN, Joi.func().required())
      .default(),

    pageObjects: Joi.object()
      .pattern(ID_PATTERN, Joi.func().required())
      .default(),

    timeouts: Joi.object()
      .keys({
        find: Joi.number().default(10000),
        try: Joi.number().default(120000),
        waitFor: Joi.number().default(20000),
        esRequestTimeout: Joi.number().default(30000),
        kibanaStabilize: Joi.number().default(15000),
        navigateStatusPageCheck: Joi.number().default(250),

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
        waitForExists: Joi.number().default(2500),
      })
      .default(),

    mochaOpts: Joi.object()
      .keys({
        bail: Joi.boolean().default(false),
        grep: Joi.string(),
        invert: Joi.boolean().default(false),
        slow: Joi.number().default(30000),
        timeout: Joi.number().default(INSPECTING ? 360000 * 100 : 360000),
        ui: Joi.string().default('bdd'),
      })
      .default(),

    updateBaselines: Joi.boolean().default(false),

    browser: Joi.object()
      .keys({
        type: Joi.string()
          .valid('chrome', 'firefox', 'ie')
          .default('chrome'),

        logPollingMs: Joi.number().default(100),
      })
      .default(),

    junit: Joi.object()
      .keys({
        enabled: Joi.boolean().default(!!process.env.CI && !process.env.DISABLE_JUNIT_REPORTER),
        reportName: Joi.string(),
      })
      .default(),

    mochaReporter: Joi.object()
      .keys({
        captureLogOutput: Joi.boolean().default(!!process.env.CI),
      })
      .default(),

    users: Joi.object().pattern(
      ID_PATTERN,
      Joi.object()
        .keys({
          username: Joi.string().required(),
          password: Joi.string().required(),
        })
        .required()
    ),

    servers: Joi.object()
      .keys({
        kibana: urlPartsSchema(),
        elasticsearch: urlPartsSchema(),
      })
      .default(),

    esTestCluster: Joi.object()
      .keys({
        license: Joi.string().default('oss'),
        from: Joi.string().default('snapshot'),
        serverArgs: Joi.array(),
        serverEnvVars: Joi.object(),
        dataArchive: Joi.string(),
        ssl: Joi.boolean().default(false),
      })
      .default(),

    kbnTestServer: Joi.object()
      .keys({
        buildArgs: Joi.array(),
        sourceArgs: Joi.array(),
        serverArgs: Joi.array(),
        installDir: Joi.string(),
      })
      .default(),

    chromedriver: Joi.object()
      .keys({
        url: Joi.string()
          .uri({ scheme: /https?/ })
          .default('http://localhost:9515'),
      })
      .default(),

    firefoxdriver: Joi.object()
      .keys({
        url: Joi.string()
          .uri({ scheme: /https?/ })
          .default('http://localhost:2828'),
      })
      .default(),

    // definition of apps that work with `common.navigateToApp()`
    apps: Joi.object()
      .pattern(ID_PATTERN, appUrlPartsSchema())
      .default(),

    // settings for the esArchiver module
    esArchiver: Joi.object()
      .keys({
        directory: Joi.string().default(defaultRelativeToConfigPath('fixtures/es_archiver')),
      })
      .default(),

    // settings for the kibanaServer.uiSettings module
    uiSettings: Joi.object()
      .keys({
        defaults: Joi.object().unknown(true),
      })
      .default(),

    // settings for the screenshots module
    screenshots: Joi.object()
      .keys({
        directory: Joi.string().default(defaultRelativeToConfigPath('screenshots')),
      })
      .default(),

    // settings for the snapshots module
    snapshots: Joi.object()
      .keys({
        directory: Joi.string().default(defaultRelativeToConfigPath('snapshots')),
      })
      .default(),

    // settings for the failureDebugging module
    failureDebugging: Joi.object()
      .keys({
        htmlDirectory: Joi.string().default(defaultRelativeToConfigPath('failure_debug/html')),
      })
      .default(),

    // settings for the find service
    layout: Joi.object()
      .keys({
        fixedHeaderHeight: Joi.number().default(50),
      })
      .default(),
  })
  .default();
