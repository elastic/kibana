/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { createLogger, LogLevel } from '../../lib/utils/create_logger';

export function getCommonServices({ target, logLevel }: { target: string; logLevel: LogLevel }) {
  const client = new Client({
    node: target,
  });

  const logger = createLogger(logLevel);

  return {
    logger,
    client,
  };
}

export type RunServices = ReturnType<typeof getCommonServices>;
