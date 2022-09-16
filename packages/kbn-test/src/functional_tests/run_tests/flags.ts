/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { v4 as uuidV4 } from 'uuid';
import { REPO_ROOT } from '@kbn/utils';
import { Flags } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';

import { EsVersion } from '../../functional_test_runner';
import { parseConfigPaths } from '../lib/config_path';

type EsFrom = 'snapshot' | 'source';
const isValidEsFrom = (v: unknown): v is EsFrom => v === 'snapshot' || v === 'source';

const getArrayOfStrings = (flags: Flags, key: string) => {
  const value = flags[key];

  if (value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    return [value];
  }

  throw createFlagError(`When specified, --${key} must be a string`);
};

export type RunTestsOptions = ReturnType<typeof parseFlags>;

export function parseFlags(flags: Flags) {
  const bail = !!flags.bail;
  const dryRun = !!flags.dryRun;
  const updateBaselines = !!flags.updateBaselines || !!flags.updateAll;
  const updateSnapshots = !!flags.updateSnapshots || !!flags.updateAll;

  const logsDir = !!flags.logToFile
    ? Path.resolve(REPO_ROOT, 'data/ftr_servers_logs', uuidV4())
    : undefined;

  const configs = parseConfigPaths(flags);
  if (!configs.length) {
    throw createFlagError('At least one --config or --journey flag is required');
  }

  const esFrom = flags.esFrom || undefined;
  if (esFrom !== undefined && !isValidEsFrom(esFrom)) {
    throw createFlagError(`invalid --esFrom, expected either "snapshot" or "source"`);
  }

  const installDir = flags['kibana-install-dir'] || undefined;
  if (installDir !== undefined && typeof installDir !== 'string') {
    throw createFlagError('When specified, --kibana-install-dir must be a single string');
  }

  const grep = flags.grep || undefined;
  if (grep !== undefined && typeof grep !== 'string') {
    throw createFlagError('When specified, --grep must be a single string');
  }

  const suiteTags = {
    include: getArrayOfStrings(flags, 'include-tag'),
    exclude: getArrayOfStrings(flags, 'exclude-tag'),
  };

  const suiteFilters = {
    include: getArrayOfStrings(flags, 'include'),
    exclude: getArrayOfStrings(flags, 'exclude'),
  };

  return {
    configs,
    esVersion: EsVersion.getDefault(),
    bail,
    dryRun,
    updateBaselines,
    updateSnapshots,
    logsDir,
    esFrom,
    installDir,
    grep,
    suiteTags,
    suiteFilters,
  };
}
