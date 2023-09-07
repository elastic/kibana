/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import globby from 'globby';
import path from 'path';
import { getPrChanges } from '#pipeline-utils';

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

export async function getAllTestFilesForConfigs(
  configPaths: string[]
): Promise<Record<string, string[]>> {
  const configPathToTestFiles = configPaths.reduce((testGroups, configPath) => {
    const testRoot = configPath.replace('/jest.config.js', '/');

    const testFiles = globby
      .sync(
        ['**/*.test.ts', '**/*.test.tsx', '**/*.test.js', '**/*.test.jsx', '!**/*integration*'],
        {
          cwd: testRoot,
          onlyFiles: true,
        }
      )
      .map((fileName) => path.join(testRoot, fileName));

    testGroups[configPath] = testFiles || [];

    return testGroups;
  }, {} as Record<string, string[]>);

  return configPathToTestFiles;
}

export async function checkForUnitTestOnlyChange(jestConfigList: string[]) {
  const jestConfigToTestFiles = await getAllTestFilesForConfigs(jestConfigList);
  const testFileToConfig = Object.keys(jestConfigToTestFiles).reduce((lookup, key) => {
    const testFiles = jestConfigToTestFiles[key];

    testFiles.forEach((testFileName) => {
      lookup[testFileName] = key;
    });

    return lookup;
  }, {} as Record<string, string>);

  const allJestTestFiles = Object.values(jestConfigToTestFiles).flat();

  const allChangedFiles = (await getPrChanges()).map((t) => t.filename);

  let isUnitTestOnlyChange = allChangedFiles.every((changedFile) =>
    allJestTestFiles.includes(changedFile)
  );

  if (!isUnitTestOnlyChange) {
    console.log("For testing, let's allow this for now...");
    isUnitTestOnlyChange = true;
  }

  const affectedUnitTestConfigs = isUnitTestOnlyChange
    ? allChangedFiles.reduce((affectedConfigs, testFileName) => {
        const configName = testFileToConfig[testFileName];
        if (!configName) {
          console.warn('Test file name not found in changed files, should not happen.', {
            configName,
            testFileName,
          });
        }

        if (configName)
          if (!affectedConfigs.includes(configName)) {
            affectedConfigs.push(configName);
          }
        return affectedConfigs;
      }, [] as string[])
    : jestConfigList;

  return {
    isUnitTestOnlyChange,
    affectedUnitTestConfigs,
  };
}
