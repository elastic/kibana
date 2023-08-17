/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { execSync } from 'child_process';
import Fs from 'fs';

import { readConfig } from 'jest-config';
import { SearchSource } from 'jest';
import Runtime from 'jest-runtime';

export const getRequiredEnv = (name: string) => {
  const value = process.env[name];
  if (typeof value !== 'string' || !value) {
    throw new Error(`Missing required environment variable "${name}"`);
  }
  return value;
};

export const getFloatFromEnv = <T>(name: string, defaultValue: T): number | T => {
  const valueStr = process.env[name];

  const value = valueStr ? parseFloat(valueStr) : defaultValue;

  if (Number.isNaN(value)) {
    throw new Error(`invalid ${name}: ${valueStr}`);
  } else {
    return value;
  }
};

export const getIntFromEnv = <T>(name: string, defaultValue: T): number | T => {
  const valueStr = process.env[name];

  const value = valueStr ? parseInt(valueStr, 10) : defaultValue;

  if (Number.isNaN(value)) {
    throw new Error(`invalid ${name}: ${valueStr}`);
  } else {
    return value;
  }
};

export const getListFromEnv = <T>(name: string, defaultValue: T): string[] | T => {
  const valueStr = process.env[name];

  if (valueStr) {
    return valueStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  } else {
    return defaultValue;
  }
};

export function getTrackedBranch(): string {
  let pkg;
  try {
    pkg = JSON.parse(Fs.readFileSync('package.json', 'utf8'));
  } catch (_) {
    const error = _ instanceof Error ? _ : new Error(`${_} thrown`);
    throw new Error(`unable to read kibana's package.json file: ${error.message}`);
  }

  const branch = pkg.branch;
  if (typeof branch !== 'string') {
    throw new Error('missing `branch` field from package.json file');
  }

  return branch;
}

export function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export function getChangedFileList(): string[] {
  const targetBranch = getTrackedBranch();

  const gitDiffOutput = execSync(`git diff HEAD..${targetBranch} --name-only`).toString().trim();

  const changedFiles = gitDiffOutput.split('\n').map((line) => line.trim());

  return changedFiles;
}

// Based on: packages/kbn-test/src/jest/configs/get_tests_for_config_paths.ts
export async function getAllTestFilesForConfigs(configPaths: string[]): Promise<string[]> {
  const EMPTY_ARGV = {
    $0: '',
    _: [],
  };

  console.log('Running all config resolution');
  return Promise.all(
    configPaths.map(async (configPath) => {
      const config = await readConfig(EMPTY_ARGV, configPath, true, null, 0, true);
      console.log(config);

      const searchSource = new SearchSource(
        await Runtime.createContext(config.projectConfig, {
          maxWorkers: 1,
          watchman: false,
          watch: false,
        })
      );

      const results = await searchSource.getTestPaths(config.globalConfig, undefined, undefined);

      return results.tests.map((t) => t.path);
    })
  ).then((x) => x.flat());
}
