/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client, ClientOptions } from '@elastic/elasticsearch';
import { ApmSynthtraceEsClient } from '../../lib/apm/client/apm_synthtrace_es_client';
import { createLogger, Logger } from '../../lib/utils/create_logger';
import { RunOptions } from './parse_run_cli_flags';

export function getLogger({ logLevel }: RunOptions) {
  return createLogger(logLevel);
}

export function getCommonServices(
  { target, cloudId, username, password, logLevel }: RunOptions,
  logger?: Logger
) {
  if (!target && !cloudId) {
    throw Error('target or cloudId needs to be specified');
  }
  const options: ClientOptions = !!target ? { node: target } : { cloud: { id: cloudId! } };
  options.auth = {
    username,
    password,
  };

  const client = new Client(options);

  logger = logger ?? createLogger(logLevel);

  const forceDataStreams = !!cloudId;
  const apmEsClient = new ApmSynthtraceEsClient(client, logger, forceDataStreams);

  return {
    logger,
    apmEsClient,
  };
}

export type RunServices = ReturnType<typeof getCommonServices>;
