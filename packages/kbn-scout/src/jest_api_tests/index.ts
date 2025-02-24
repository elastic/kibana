/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Url from 'url';
import { esTestConfig, KbnClient, kbnTestConfig } from '@kbn/test';
import type { EsArchiver } from '@kbn/es-archiver';
import {
  type EsClient,
  getEsArchiver,
  getEsClient,
  getKbnClient,
  getLogger,
  type ScoutTestConfig,
} from '../..';

export const scoutApiTestConfig: ScoutTestConfig = {
  serverless: false,
  isCloud: false,
  license: 'trial',
  hosts: {
    kibana: Url.format({
      protocol: kbnTestConfig.getUrlParts().protocol,
      hostname: kbnTestConfig.getUrlParts().hostname,
      port: kbnTestConfig.getUrlParts().port,
    }),
    elasticsearch: Url.format({
      protocol: esTestConfig.getUrlParts().protocol,
      hostname: esTestConfig.getUrlParts().hostname,
      port: esTestConfig.getUrlParts().port,
    }),
  },
  auth: {
    username: 'elastic',
    password: 'changeme',
  },
};

const log = getLogger();
const kbnClient = getKbnClient(scoutApiTestConfig, log);
const esClient = getEsClient(scoutApiTestConfig, log);

export const clients = (): ScoutApiTestClients => ({
  kbnClient,
  esClient,
  esArchiver: getEsArchiver(esClient, kbnClient, log),
});

export interface ScoutApiTestClients {
  kbnClient: KbnClient;
  esClient: EsClient;
  esArchiver: EsArchiver;
}
