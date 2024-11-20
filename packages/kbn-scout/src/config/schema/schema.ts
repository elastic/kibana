/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Joi from 'joi';

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
      waitForLogLineTimeoutMs: Joi.number().integer().optional(),
      waitFor: Joi.func().optional(),
      args: Joi.array().items(Joi.string()).optional(),
    })
    .default();

export const schema = Joi.object()
  .keys({
    serverless: Joi.boolean().default(false),
    servers: Joi.object()
      .keys({
        kibana: urlPartsSchema(),
        elasticsearch: urlPartsSchema({
          requiredKeys: ['port'],
        }),
        fleetserver: urlPartsSchema(),
      })
      .default(),

    esTestCluster: Joi.object()
      .keys({
        license: Joi.valid('basic', 'trial', 'gold').default('basic'),
        from: Joi.string().default('snapshot'),
        serverArgs: Joi.array().items(Joi.string()).default([]),
        esJavaOpts: Joi.string(),
        dataArchive: Joi.string(),
        ssl: Joi.boolean().default(false),
        ccs: Joi.object().keys({
          remoteClusterUrl: Joi.string().uri({
            scheme: /https?/,
          }),
        }),
        files: Joi.array().items(Joi.string()),
      })
      .default(),

    esServerlessOptions: Joi.object()
      .keys({
        host: Joi.string().ip(),
        resources: Joi.array().items(Joi.string()).default([]),
      })
      .default(),

    kbnTestServer: Joi.object()
      .keys({
        buildArgs: Joi.array(),
        sourceArgs: Joi.array(),
        serverArgs: Joi.array(),
        installDir: Joi.string(),
        useDedicatedTaskRunner: Joi.boolean().default(false),
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

            /**
             * Does this test config only work when run against source?
             */
            alwaysUseSource: Joi.boolean().default(false),
          })
          .default(),
        env: Joi.object().unknown().default(),
        delayShutdown: Joi.number(),
      })
      .default(),

    // settings for the kibanaServer.uiSettings module
    uiSettings: Joi.object()
      .keys({
        defaults: Joi.object().unknown(true),
      })
      .default(),

    dockerServers: Joi.object().pattern(Joi.string(), dockerServerSchema()).default(),
  })
  .default();
