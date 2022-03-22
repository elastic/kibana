/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client, ClientOptions } from '@elastic/elasticsearch';
import { createLogger } from '../../lib/utils/create_logger';
import { RunOptions } from './parse_run_cli_flags';

export function getCommonServices({ target, cloudId, username, password, logLevel }: RunOptions) {
  if (!target && !cloudId) {
    throw Error('target or cloudId needs to be specified');
  }
  const options: ClientOptions = !!target ? { node: target } : { cloud: { id: cloudId! } };
  options.auth = {
    username,
    password,
  };

  const client = new Client(options);

  const logger = createLogger(logLevel);

  return {
    logger,
    client,
  };
}

export type RunServices = ReturnType<typeof getCommonServices>;
