/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KbnClient, createEsClientForTesting } from '@kbn/test';
import { test } from 'vitest';
import * as Url from 'url';
import Fs from 'fs';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { ToolingLog } from '@kbn/tooling-log';
import { EsArchiver } from '@kbn/es-archiver';
import supertest, { AgentOptions } from 'supertest';
import { REPO_ROOT } from '@kbn/repo-info';
import TestAgent from 'supertest/lib/agent';
import { Client } from '@elastic/elasticsearch';
import { getLogger, ScoutLogger } from '@kbn/scout';
export { getLogger, type ScoutLogger } from '@kbn/scout';

// Without the following declaration,
// we will see this error:
// Argument of type '"API_KEY"' is not assignable to parameter of type 'never'.ts(2345)
declare module 'vitest' {
  // Augmenting ProvidedContext
  export interface ProvidedContext {
    // Must be serializable
    SOME_KEY: string;
  }
}
export interface ApiTest {
  esUrl: string;
  kbnUrl: string;
  kbnClient: KbnClient;
  esArchiver: EsArchiver;
  supertest: TestAgent;
  es: Client;
  log: ScoutLogger;
}

export const apiTest = test.extend<ApiTest>({
  esUrl: async ({}, use) => {
    await use(Url.format(new URL('http://kibana_system:changeme@localhost:9220')));
  },
  kbnUrl: async ({}, use) => {
    await use(Url.format(new URL('http://elastic:changeme@localhost:5620')));
  },
  kbnClient: async ({ kbnUrl, esUrl }, use) => {
    const kbnClient = new KbnClient({
      log: new ToolingLog({ level: 'verbose', writeTo: process.stdout }),
      url: kbnUrl,
      ...(esUrl.includes('https')
        ? { certificateAuthorities: [Fs.readFileSync(CA_CERT_PATH)] }
        : {}),
    });
    await use(kbnClient);
  },
  es: async ({ esUrl }, use) => {
    const client = createEsClientForTesting({
      esUrl,
      authOverride: {
        username: 'system_indices_superuser',
        password: 'changeme',
      },
    });

    await use(client);
  },
  esArchiver: async ({ kbnClient, es: client }, use) => {
    const esArchiver = new EsArchiver({
      log: new ToolingLog({ level: 'verbose', writeTo: process.stdout }),
      client,
      kbnClient,
      baseDir: REPO_ROOT,
    });

    await use(esArchiver);
  },
  supertest: async ({ kbnUrl }, use) => {
    const options: AgentOptions = {};
    const request = supertest(kbnUrl, options);
    await use(request);
  },
  log: getLogger('apiTest'),
});
