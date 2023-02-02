/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { v4 as uuidV4 } from 'uuid';
import { FlagsReader, FlagOptions } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';

import { EsVersion } from '../../functional_test_runner';

export type StartServerOptions = ReturnType<typeof parseFlags>;

export const FLAG_OPTIONS: FlagOptions = {
  string: ['config', 'journey', 'esFrom', 'kibana-install-dir'],
  boolean: ['logToFile'],
  help: `
    --config             Define a FTR config that should be executed. Can be specified multiple times
    --journey            Define a Journey that should be executed. Can be specified multiple times
    --esFrom             Build Elasticsearch from source or run from snapshot. Default: $TEST_ES_FROM or "snapshot"
    --kibana-install-dir Run Kibana from existing install directory instead of from source
    --logToFile          Write the log output from Kibana/ES to files instead of to stdout
  `,
};

export function parseFlags(flags: FlagsReader) {
  const configs = [
    ...(flags.arrayOfPaths('config') ?? []),
    ...(flags.arrayOfPaths('journey') ?? []),
  ];
  if (configs.length !== 1) {
    throw createFlagError(`expected exactly one --config or --journey flag`);
  }

  return {
    config: configs[0],
    esFrom: flags.enum('esFrom', ['source', 'snapshot']),
    esVersion: EsVersion.getDefault(),
    installDir: flags.string('kibana-install-dir'),
    logsDir: flags.boolean('logToFile')
      ? Path.resolve(REPO_ROOT, 'data/ftr_servers_logs', uuidV4())
      : undefined,
  };
}
