/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidV4 } from 'uuid';
import { resolve } from 'path';
import { FlagsReader, FlagOptions } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import { CliSupportedServerModes } from '../types';

export type StartServerOptions = ReturnType<typeof parseServerFlags>;

export const SERVER_FLAG_OPTIONS: FlagOptions = {
  string: ['serverless', 'esFrom', 'kibana-install-dir'],
  boolean: ['stateful', 'logToFile'],
  help: `
    --stateful           Start Elasticsearch and Kibana with default ESS configuration
    --serverless         Start Elasticsearch and Kibana with serverless project configuration: es | oblt | security
    --esFrom             Build Elasticsearch from source or run snapshot or serverless. Default: $TEST_ES_FROM or "snapshot"
    --kibana-install-dir Run Kibana from existing install directory instead of from source
    --logToFile          Write the log output from Kibana/ES to files instead of to stdout
  `,
};

export function parseServerFlags(flags: FlagsReader) {
  const serverlessType = flags.enum('serverless', ['es', 'oblt', 'security']);
  const isStateful = flags.boolean('stateful');

  if (!(serverlessType || isStateful) || (serverlessType && isStateful)) {
    throw createFlagError(`Expected exactly one of --serverless=<type> or --stateful flag`);
  }

  const mode: CliSupportedServerModes = serverlessType
    ? `serverless=${serverlessType}`
    : 'stateful';

  const esFrom = flags.enum('esFrom', ['source', 'snapshot', 'serverless']);
  const installDir = flags.string('kibana-install-dir');
  const logsDir = flags.boolean('logToFile')
    ? resolve(REPO_ROOT, 'data/ftr_servers_logs', uuidV4())
    : undefined;

  return {
    mode,
    esFrom,
    installDir,
    logsDir,
  };
}
