/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { dirname, resolve } from 'path';

import Joi from 'joi';
import type { CustomHelpers } from 'joi';

// valid pattern for ID
// enforced camel-case identifiers for consistency
const ID_PATTERN = /^[a-zA-Z0-9_]+$/;
// it will search both --inspect and --inspect-brk
const INSPECTING = !!process.execArgv.find((arg) => arg.includes('--inspect'));

const maybeRequireKeys = (keys: string[], schemas: Record<string, Joi.Schema>) => {
  if (!keys.length) {
    return schemas;
  }

  const withRequires: Record<string, Joi.Schema> = {};
  for (const [key, schema] of Object.entries(schemas)) {
    withRequires[key] = keys.includes(key) ? schema.required() : schema;
  }
  return withRequires;
};

const urlPartsSchema = ({ requiredKeys }: { requiredKeys?: string[] } = {}) =>
  Joi.object()
    .keys(
      maybeRequireKeys(requiredKeys ?? [], {
        protocol: Joi.string().valid('http', 'https').default('http'),
        hostname: Joi.string().hostname().default('localhost'),
        port: Joi.number(),
        auth: Joi.string().regex(/^[^:]+:.+$/, 'username and password separated by a colon'),
        username: Joi.string(),
        password: Joi.string(),
        pathname: Joi.string().regex(/^\//, 'start with a /'),
        hash: Joi.string().regex(/^\//, 'start with a /'),
        certificateAuthorities: Joi.array().items(Joi.binary()).optional(),
      })
    )
    .default();

const appUrlPartsSchema = () =>
  Joi.object()
    .keys({
      pathname: Joi.string().regex(/^\//, 'start with a /'),
      hash: Joi.string().regex(/^\//, 'start with a /'),
    })
    .default();

const requiredWhenEnabled = (schema: Joi.Schema) => {
  return Joi.when('enabled', {
    is: true,
    then: schema.required(),
    otherwise: schema.optional(),
  });
};

const dockerServerSchema = () =>
  Joi.object()
    .keys({
      enabled: Joi.boolean().required(),
      image: requiredWhenEnabled(Joi.string()),
      port: requiredWhenEnabled(Joi.number()),
      portInContainer: requiredWhenEnabled(Joi.number()),
      waitForLogLine: Joi.alternatives(Joi.object().instance(RegExp), Joi.string()).optional(),
      waitFor: Joi.func().optional(),
      args: Joi.array().items(Joi.string()).optional(),
    })
    .default();

const defaultRelativeToConfigPath = (path: string) => {
  const makeDefault = (parent: any, helpers: CustomHelpers) => {
    helpers.schema.description(`<config.js directory>/${path}`);
    return resolve(dirname(helpers.prefs.context!.path), path);
  };
  return makeDefault;
};

export const schema = Joi.object()
  .keys({
    rootTags: Joi.array().items(Joi.string()),
    testFiles: Joi.array().items(Joi.string()),
    testRunner: Joi.func(),

    suiteFiles: Joi.object()
      .keys({
        include: Joi.array().items(Joi.string()).default([]),
        exclude: Joi.array().items(Joi.string()).default([]),
      })
      .default(),

    suiteTags: Joi.object()
      .keys({
        include: Joi.array().items(Joi.string()).default([]),
        exclude: Joi.array().items(Joi.string()).default([]),
      })
      .default(),

    servicesRequiredForTestAnalysis: Joi.array().items(Joi.string()).default([]),
    services: Joi.object().pattern(ID_PATTERN, Joi.func().required()).default(),

    pageObjects: Joi.object().pattern(ID_PATTERN, Joi.func().required()).default(),

    timeouts: Joi.object()
      .keys({
        find: Joi.number().default(10000),
        try: Joi.number().default(120000),
        waitFor: Joi.number().default(20000),
        esRequestTimeout: Joi.number().default(30000),
        kibanaReportCompletion: Joi.number().default(60_000),
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
        dryRun: Joi.boolean().default(false),
        grep: Joi.string(),
        invert: Joi.boolean().default(false),
        slow: Joi.number().default(30000),
        timeout: Joi.number().default(INSPECTING ? 360000 * 100 : 360000),
        ui: Joi.string().default('bdd'),
      })
      .default(),

    updateBaselines: Joi.boolean().default(false),
    updateSnapshots: Joi.boolean().default(false),
    browser: Joi.object()
      .keys({
        type: Joi.string().valid('chrome', 'firefox', 'msedge').default('chrome'),

        logPollingMs: Joi.number().default(100),
        acceptInsecureCerts: Joi.boolean().default(false),
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
        captureLogOutput: Joi.boolean().default(
          !!process.env.CI && !process.env.DISABLE_CI_LOG_OUTPUT_CAPTURE
        ),
        sendToCiStats: Joi.boolean().default(!!process.env.CI),
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
        elasticsearch: urlPartsSchema({
          requiredKeys: ['port'],
        }),
      })
      .default(),

    esTestCluster: Joi.object()
      .keys({
        license: Joi.valid('basic', 'trial', 'gold').default('basic'),
        from: Joi.string().default('snapshot'),
        serverArgs: Joi.array().items(Joi.string()),
        esJavaOpts: Joi.string(),
        dataArchive: Joi.string(),
        ssl: Joi.boolean().default(false),
        ccs: Joi.object().keys({
          remoteClusterUrl: Joi.string().uri({
            scheme: /https?/,
          }),
        }),
      })
      .default(),

    kbnTestServer: Joi.object()
      .keys({
        buildArgs: Joi.array(),
        sourceArgs: Joi.array(),
        serverArgs: Joi.array(),
        installDir: Joi.string(),
        /** Options for how FTR should execute and interact with Kibana */
        runOptions: Joi.object()
          .keys({
            /**
             * Log message to wait for before initiating tests, defaults to waiting for Kibana status to be `available`.
             * Note that this log message must not be filtered out by the current logging config, for example by the
             * log level. If needed, you can adjust the logging level via `kbnTestServer.serverArgs`.
             */
            wait: Joi.object()
              .regex()
              .default(/Kibana is now available/),
          })
          .default(),
        env: Joi.object().unknown().default(),
        delayShutdown: Joi.number(),
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
    apps: Joi.object().pattern(ID_PATTERN, appUrlPartsSchema()).default(),

    // settings for the saved objects svc
    kbnArchiver: Joi.object()
      .keys({
        directory: Joi.string().default(defaultRelativeToConfigPath('fixtures/kbn_archiver')),
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
        fixedHeaderHeight: Joi.number().default(100),
      })
      .default(),

    // settings for the security service if there is no defaultRole defined, then default to superuser role.
    security: Joi.object()
      .keys({
        roles: Joi.object().default(),
        remoteEsRoles: Joi.object(),
        defaultRoles: Joi.array()
          .items(Joi.string())
          .when('$primary', {
            is: true,
            then: Joi.array().min(1),
          })
          .default(['superuser']),
        disableTestUser: Joi.boolean(),
      })
      .default(),

    dockerServers: Joi.object().pattern(Joi.string(), dockerServerSchema()).default(),
  })
  .default();
