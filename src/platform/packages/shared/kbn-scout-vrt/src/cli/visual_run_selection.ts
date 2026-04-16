/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import FsPromises from 'fs/promises';
import path from 'path';
import { createFlagError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import { testConfigs } from '@kbn/scout-reporting';
import type { ParsedVisualRunTestsArgs } from './arg_parsing';
import { createVisualTestDependencyResolver } from './visual_test_dependency';

const SCOUT_TEST_DIR_PATTERN = /\/(scout(?:_[^/]+)?)\/(ui|api)\/(tests|parallel_tests)/;

interface CandidateTestSelection {
  candidateFiles: string[];
  derivedConfigPath?: string;
}

export interface VisualRunSelection {
  configPath: string;
  visualTestFiles: string[];
}

interface ScoutPlaywrightConfigShape {
  testDir?: string;
}

const toRepoRelativePath = (absolutePath: string): string =>
  path.relative(REPO_ROOT, absolutePath).split(path.sep).join('/');

const isSpecFile = (fileName: string): boolean => fileName.endsWith('.spec.ts');

const listSpecFilesInDirectory = async (directoryPath: string): Promise<string[]> => {
  const entries = await FsPromises.readdir(directoryPath, { withFileTypes: true });
  const specFiles: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      specFiles.push(...(await listSpecFilesInDirectory(entryPath)));
      continue;
    }

    if (entry.isFile() && isSpecFile(entry.name)) {
      specFiles.push(entryPath);
    }
  }

  return specFiles;
};

const repoRootPrefix = REPO_ROOT.endsWith(path.sep) ? REPO_ROOT : `${REPO_ROOT}${path.sep}`;

const ensureRepoPath = (inputPath: string): string => {
  const absolutePath = path.resolve(REPO_ROOT, inputPath);

  if (!absolutePath.startsWith(repoRootPrefix) && absolutePath !== REPO_ROOT) {
    throw createFlagError(`Path must be within the repository: ${inputPath}`);
  }

  if (!Fs.existsSync(absolutePath)) {
    throw createFlagError(`Path does not exist: ${inputPath}`);
  }

  return absolutePath;
};

const ensureRepoAbsolutePath = (absolutePath: string, inputPath: string): string => {
  if (!absolutePath.startsWith(repoRootPrefix) && absolutePath !== REPO_ROOT) {
    throw createFlagError(`Path must be within the repository: ${inputPath}`);
  }

  if (!Fs.existsSync(absolutePath)) {
    throw createFlagError(`Path does not exist: ${inputPath}`);
  }

  return absolutePath;
};

const deriveConfigPath = (normalizedPath: string, originalPath: string): string => {
  const match = normalizedPath.match(SCOUT_TEST_DIR_PATTERN);

  if (!match) {
    throw createFlagError(`Unable to derive config path for path: ${originalPath}`);
  }

  const [, scoutDir, type, testType] = match;
  const scoutIndex = normalizedPath.indexOf(`/${scoutDir}/${type}/`);
  const pathPrefix = normalizedPath.substring(0, scoutIndex);
  const scoutBasePath = `${pathPrefix}/${scoutDir}/${type}`;

  return testType === 'parallel_tests'
    ? `${scoutBasePath}/parallel.playwright.config.ts`
    : `${scoutBasePath}/playwright.config.ts`;
};

const collectCandidateTestFilesFromInput = async (
  parsedArgs: ParsedVisualRunTestsArgs
): Promise<CandidateTestSelection> => {
  if (!parsedArgs.testFilesList) {
    return {
      candidateFiles: [],
      derivedConfigPath: parsedArgs.configPath,
    };
  }

  const inputPaths = parsedArgs.testFilesList
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const candidateFiles: string[] = [];
  let derivedConfigPath: string | undefined;

  for (const inputPath of inputPaths) {
    const absolutePath = ensureRepoPath(inputPath);
    const stat = await FsPromises.stat(absolutePath);
    const normalizedPath = inputPath.replace(/\\/g, '/');
    const configPath = deriveConfigPath(normalizedPath, inputPath);

    if (derivedConfigPath === undefined) {
      derivedConfigPath = configPath;
    } else if (derivedConfigPath !== configPath) {
      throw createFlagError(
        `All '--testFiles' paths must belong to the same Scout Playwright config: ${inputPath}`
      );
    }

    if (stat.isDirectory()) {
      candidateFiles.push(...(await listSpecFilesInDirectory(absolutePath)));
      continue;
    }

    if (!stat.isFile() || !isSpecFile(absolutePath)) {
      throw createFlagError(`File must be a test file ending '*.spec.ts': ${inputPath}`);
    }

    candidateFiles.push(absolutePath);
  }

  return {
    candidateFiles,
    derivedConfigPath,
  };
};

const loadConfigModule = async (
  configPath: string
): Promise<{ absoluteConfigPath: string; config: ScoutPlaywrightConfigShape }> => {
  const absoluteConfigPath = ensureRepoPath(configPath);
  const configModule = await import(absoluteConfigPath);

  return {
    absoluteConfigPath,
    config: configModule.default as ScoutPlaywrightConfigShape,
  };
};

const resolveConfigTestDir = (
  absoluteConfigPath: string,
  config: ScoutPlaywrightConfigShape
): string => {
  if (typeof config.testDir !== 'string' || config.testDir.length === 0) {
    throw createFlagError(
      `The config file at "${toRepoRelativePath(
        absoluteConfigPath
      )}" must export a valid Playwright config with a 'testDir'`
    );
  }

  return ensureRepoAbsolutePath(
    path.resolve(path.dirname(absoluteConfigPath), config.testDir),
    config.testDir
  );
};

const discoverVisualTestFiles = async (candidateFiles: string[]): Promise<string[]> => {
  const hasVisualDependency = createVisualTestDependencyResolver();
  const visualTestFiles: string[] = [];

  for (const candidateFile of candidateFiles.sort()) {
    if (await hasVisualDependency(candidateFile)) {
      visualTestFiles.push(toRepoRelativePath(candidateFile));
    }
  }

  return visualTestFiles;
};

export const discoverVisualTestFilesForConfig = async (configPath: string): Promise<string[]> => {
  const { absoluteConfigPath, config } = await loadConfigModule(configPath);
  const testDir = resolveConfigTestDir(absoluteConfigPath, config);
  const candidateFiles = await listSpecFilesInDirectory(testDir);

  return discoverVisualTestFiles(candidateFiles);
};

export const discoverAllVisualRunSelections = async (): Promise<VisualRunSelection[]> => {
  const selections: VisualRunSelection[] = [];

  for (const configPath of testConfigs.all
    .map(({ path: currentConfigPath }) => currentConfigPath)
    .sort((left, right) => left.localeCompare(right))) {
    let visualTestFiles: string[];

    try {
      visualTestFiles = await discoverVisualTestFilesForConfig(configPath);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Path does not exist:')) {
        continue;
      }

      throw error;
    }

    if (visualTestFiles.length === 0) {
      continue;
    }

    selections.push({
      configPath,
      visualTestFiles,
    });
  }

  return selections;
};

export const discoverSelectedVisualRunSelections = async (
  parsedArgs: ParsedVisualRunTestsArgs
): Promise<VisualRunSelection[]> => {
  if (parsedArgs.configPath) {
    return [
      {
        configPath: parsedArgs.configPath,
        visualTestFiles: await discoverVisualTestFilesForConfig(parsedArgs.configPath),
      },
    ];
  }

  const { candidateFiles, derivedConfigPath } = await collectCandidateTestFilesFromInput(
    parsedArgs
  );

  return [
    {
      configPath: derivedConfigPath!,
      visualTestFiles: await discoverVisualTestFiles(candidateFiles),
    },
  ];
};
