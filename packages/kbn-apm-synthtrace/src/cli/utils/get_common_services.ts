/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client, ClientOptions } from '@elastic/elasticsearch';
import { format, parse, Url } from 'url';
import fetch from 'node-fetch';
import { ApmSynthtraceKibanaClient } from '../../lib/apm/client/apm_synthtrace_kibana_client';
import { ApmSynthtraceEsClient } from '../../lib/apm/client/apm_synthtrace_es_client';
import { createLogger, Logger } from '../../lib/utils/create_logger';
import { RunOptions } from './parse_run_cli_flags';

async function discoverAuth(parsedTarget: Url) {
  const possibleCredentials = [`admin:changeme`, `elastic:changeme`];
  for (const auth of possibleCredentials) {
    const url = format({
      ...parsedTarget,
      auth,
    });
    let status: number;
    try {
      const response = await fetch(url);
      status = response.status;
    } catch (err) {
      status = 0;
    }

    if (status === 200) {
      return auth;
    }
  }

  throw new Error(`Failed to authenticate user for ${format(parsedTarget)}`);
}

export function getLogger({ logLevel }: RunOptions) {
  return createLogger(logLevel);
}

export async function getCommonServices({
  target,
  logLevel,
  kibana,
  esConcurrency,
  version: versionOverride,
  logger,
  installPackage = true,
}: RunOptions & { logger?: Logger; installPackage?: boolean }) {
  if (!target) {
    // assume things are running locally
    kibana = kibana || 'http://localhost:5601';
    target = 'http://localhost:9200';
  }

  if (!target) {
    throw new Error('Could not determine an Elasticsearch target');
  }

  const parsedTarget = parse(target);

  let auth = parsedTarget.auth;

  if (!parsedTarget.auth) {
    auth = await discoverAuth(parsedTarget);
  }

  const formatted = format({
    ...parsedTarget,
    auth,
  });

  const kibanaUrl = kibana || target.replace('.es', '.kb');

  const parsedKibanaUrl = parse(kibanaUrl);

  const kibanaUrlWithAuth = format({
    ...parsedKibanaUrl,
    auth,
  });

  const options: ClientOptions = { node: formatted };

  const client = new Client(options);

  logger = logger ?? createLogger(logLevel);

  // We automatically set up managed APM either by migrating on cloud or installing the package locally
  const kibanaClient = new ApmSynthtraceKibanaClient({
    logger,
    target: kibanaUrlWithAuth,
  });

  await kibanaClient.init();

  const version = versionOverride || (await kibanaClient.fetchLatestApmPackageVersion());

  if (installPackage) {
    await kibanaClient.installApmPackage(version);
  }

  const apmEsClient = new ApmSynthtraceEsClient({
    client,
    logger,
    version,
    concurrency: esConcurrency,
  });

  return {
    logger,
    apmEsClient,
  };
}

export type RunServices = ReturnType<typeof getCommonServices>;
