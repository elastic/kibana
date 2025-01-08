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
import { Logger } from '@kbn/apm-synthtrace/src/lib/utils/create_logger';
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

// Adapting ToolingLog instance to Logger interface
class LoggerAdapter implements Logger {
  private log: ToolingLog;
  private joiner = ', ';

  constructor(log: ToolingLog) {
    this.log = log;
  }

  debug(...args: any[]): void {
    this.log.debug(args.join(this.joiner));
  }

  info(...args: any[]): void {
    this.log.info(args.join(this.joiner));
  }

  error(arg: string | Error): void {
    this.log.error(arg);
  }

  perf<T>(name: string, cb: () => T): T {
    const startTime = Date.now();
    const result = cb();
    const duration = Date.now() - startTime;
    const durationInSeconds = duration / 1000;
    const formattedTime = durationInSeconds.toFixed(3) + 's';
    this.log.info(`${name} took ${formattedTime}.`);
    return result;
  }
}

async function initInfraSynthtraceClient(options: SynthtraceClientOptions) {
  const { log, es, auth, kbnUrl } = options;
  const logger: Logger = new LoggerAdapter(log);

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
  const logger: Logger = new LoggerAdapter(log);
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
  });

  synthEsClient.pipeline(synthEsClient.getDefaultPipeline({ includeSerialization: false }));

  return synthEsClient;
}
