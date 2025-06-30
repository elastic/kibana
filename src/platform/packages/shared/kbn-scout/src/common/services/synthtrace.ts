/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ApmSynthtraceEsClient,
  ApmSynthtraceKibanaClient,
  InfraSynthtraceEsClient,
  InfraSynthtraceKibanaClient,
  LogLevel,
  LogsSynthtraceEsClient,
  createLogger,
} from '@kbn/apm-synthtrace';
import { ScoutLogger } from './logger';
import { EsClient } from '../../types';

let apmSynthtraceEsClientInstance: ApmSynthtraceEsClient | undefined;
let infraSynthtraceEsClientInstance: InfraSynthtraceEsClient | undefined;
let logsSynthtraceEsClientInstance: LogsSynthtraceEsClient | undefined;
const logger = createLogger(LogLevel.info);

export async function getApmSynthtraceEsClient(
  esClient: EsClient,
  target: string,
  log: ScoutLogger
) {
  if (!apmSynthtraceEsClientInstance) {
    const apmSynthtraceKibanaClient = new ApmSynthtraceKibanaClient({
      logger,
      target,
    });

    const version = await apmSynthtraceKibanaClient.fetchLatestApmPackageVersion();
    await apmSynthtraceKibanaClient.installApmPackage(version);
    apmSynthtraceEsClientInstance = new ApmSynthtraceEsClient({
      client: esClient,
      logger,
      refreshAfterIndex: true,
      version,
      pipeline: {
        includeSerialization: false,
      },
    });

    log.serviceLoaded('apmSynthtraceClient');
  }

  return apmSynthtraceEsClientInstance;
}

export async function getInfraSynthtraceEsClient(
  esClient: EsClient,
  kbnUrl: string,
  auth: { username: string; password: string },
  log: ScoutLogger
) {
  if (!infraSynthtraceEsClientInstance) {
    const infraSynthtraceKibanaClient = new InfraSynthtraceKibanaClient({
      logger,
      target: kbnUrl,
      username: auth.username,
      password: auth.password,
    });

    const version = await infraSynthtraceKibanaClient.fetchLatestSystemPackageVersion();
    await infraSynthtraceKibanaClient.installSystemPackage(version);
    infraSynthtraceEsClientInstance = new InfraSynthtraceEsClient({
      client: esClient,
      logger,
      refreshAfterIndex: true,
      pipeline: {
        includeSerialization: false,
      },
    });

    log.serviceLoaded('infraSynthtraceClient');
  }

  return infraSynthtraceEsClientInstance;
}

export async function getLogsSynthtraceEsClient(esClient: EsClient, log: ScoutLogger) {
  if (!logsSynthtraceEsClientInstance) {
    logsSynthtraceEsClientInstance = new LogsSynthtraceEsClient({
      client: esClient,
      logger,
      refreshAfterIndex: true,
      pipeline: {
        includeSerialization: false,
      },
    });

    log.serviceLoaded('logsSynthtraceClient');
  }

  return logsSynthtraceEsClientInstance;
}
