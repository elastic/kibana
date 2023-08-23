/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { defaultsDeep } from 'lodash';
import { Cluster } from '@kbn/es';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';
import { CliArgs } from '@kbn/config';
import { createRoot } from './create_root';

export type TestServerlessESUtils = ReturnType<typeof createServerlessES>;

export const createServerlessES = () => {
  const log = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });
  const cluster = new Cluster({ log });

  const api = {
    start: async () => {
      await cluster.runServerless({
        basePath: Path.join(REPO_ROOT, '.es/es_test_serverless'),
      });
    },
    stop: async () => {
      // hack to stop the ES cluster
      await execa('docker', ['container', 'stop', 'es01', 'es02', 'es03']);
    },
  };

  return api;
};

export type TestServerlessKibanaUtils = ReturnType<typeof createServerlessKibana>;

const defaults = {
  server: {
    port: 5620,
  },
  elasticsearch: {
    serviceAccountToken: 'BEEF',
  },
};
export const createServerlessKibana = (settings = {}, cliArgs: Partial<CliArgs> = {}) => {
  return createRoot(defaultsDeep(settings, defaults), { ...cliArgs, serverless: true });
};
