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
} from '@kbn/apm-synthtrace';
import { ToolingLog } from '@kbn/tooling-log';
import Url from 'url';
import { type Logger, extendToolingLog } from '@kbn/apm-synthtrace';
import { Auth, Es } from '.';
import { KibanaUrl } from './kibana_url';

export interface SynthtraceClientOptions {
  kbnUrl: KibanaUrl;
  auth: Auth;
  es: Es;
  log: ToolingLog;
}
export type SynthtraceClient = InfraSynthtraceEsClient | ApmSynthtraceEsClient;
export type SynthtraceClientType = 'infra' | 'apm';

export async function getSynthtraceClient(
  type: SynthtraceClientType,
  options: SynthtraceClientOptions
): Promise<SynthtraceClient> {
  if (type === 'infra') {
    return initInfraSynthtraceClient(options);
  } else {
    return initApmSynthtraceClient(options);
  }
}

async function initInfraSynthtraceClient(options: SynthtraceClientOptions) {
  const { log, es, auth, kbnUrl } = options;
  const logger: Logger = extendToolingLog(log);

  const synthKbnClient = new InfraSynthtraceKibanaClient({
    logger,
    target: kbnUrl.get(),
    username: auth.getUsername(),
    password: auth.getPassword(),
  });
  const pkgVersion = await synthKbnClient.fetchLatestSystemPackageVersion();
  await synthKbnClient.installSystemPackage(pkgVersion);

  const synthEsClient = new InfraSynthtraceEsClient({
    logger,
    client: es,
    refreshAfterIndex: true,
  });

  return synthEsClient;
}

async function initApmSynthtraceClient(options: SynthtraceClientOptions) {
  const { log, es, auth, kbnUrl } = options;
  const logger: Logger = extendToolingLog(log);
  const kibanaUrl = new URL(kbnUrl.get());
  const kibanaUrlWithAuth = Url.format({
    protocol: kibanaUrl.protocol,
    hostname: kibanaUrl.hostname,
    port: kibanaUrl.port,
    auth: `${auth.getUsername()}:${auth.getPassword()}`,
  });

  const synthKbnClient = new ApmSynthtraceKibanaClient({
    logger,
    target: kibanaUrlWithAuth,
  });
  const packageVersion = await synthKbnClient.fetchLatestApmPackageVersion();
  await synthKbnClient.installApmPackage(packageVersion);

  const synthEsClient = new ApmSynthtraceEsClient({
    client: es,
    logger,
    refreshAfterIndex: true,
    version: packageVersion,
    pipeline: {
      includeSerialization: false,
    },
  });

  return synthEsClient;
}
