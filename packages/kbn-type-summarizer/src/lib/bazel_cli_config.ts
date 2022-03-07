/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import { CliError } from './cli_error';
import { parseCliFlags } from './cli_flags';

const TYPE_SUMMARIZER_PACKAGES = ['@kbn/type-summarizer', '@kbn/crypto'];

const isString = (i: any): i is string => typeof i === 'string' && i.length > 0;

interface BazelCliConfig {
  packageName: string;
  outputDir: string;
  tsconfigPath: string;
  inputPath: string;
  repoRelativePackageDir: string;
  use: 'api-extractor' | 'type-summarizer';
}

export function parseBazelCliFlags(argv: string[]): BazelCliConfig {
  const { rawFlags, unknownFlags } = parseCliFlags(argv, {
    string: ['use'],
    default: {
      use: 'api-extractor',
    },
  });

  if (unknownFlags.length) {
    throw new CliError(`Unknown flags: ${unknownFlags.join(', ')}`, {
      showHelp: true,
    });
  }

  let REPO_ROOT;
  try {
    const name = 'utils';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const utils = require('@kbn/' + name);
    REPO_ROOT = utils.REPO_ROOT as string;
  } catch (error) {
    if (error && error.code === 'MODULE_NOT_FOUND') {
      throw new CliError('type-summarizer bazel cli only works after bootstrap');
    }

    throw error;
  }

  const [relativePackagePath, ...extraPositional] = rawFlags._;
  if (typeof relativePackagePath !== 'string') {
    throw new CliError(`missing path to package as first positional argument`, { showHelp: true });
  }
  if (extraPositional.length) {
    throw new CliError(`extra positional arguments`, { showHelp: true });
  }

  const use = rawFlags.use;
  if (use !== 'api-extractor' && use !== 'type-summarizer') {
    throw new CliError(`invalid --use flag, expected "api-extractor" or "type-summarizer"`);
  }

  const packageDir = Path.resolve(relativePackagePath);
  const packageName: string = JSON.parse(
    Fs.readFileSync(Path.join(packageDir, 'package.json'), 'utf8')
  ).name;
  const repoRelativePackageDir = Path.relative(REPO_ROOT, packageDir);

  return {
    use,
    packageName,
    tsconfigPath: Path.join(REPO_ROOT, repoRelativePackageDir, 'tsconfig.json'),
    inputPath: Path.resolve(REPO_ROOT, 'node_modules', packageName, 'target_types/index.d.ts'),
    repoRelativePackageDir,
    outputDir: Path.resolve(REPO_ROOT, 'data/type-summarizer-output', use),
  };
}

export function parseBazelCliJson(json: string): BazelCliConfig {
  let config;
  try {
    config = JSON.parse(json);
  } catch (error) {
    throw new CliError('unable to parse first positional argument as JSON');
  }

  if (typeof config !== 'object' || config === null) {
    throw new CliError('config JSON must be an object');
  }

  const packageName = config.packageName;
  if (!isString(packageName)) {
    throw new CliError('packageName config must be a non-empty string');
  }

  const outputDir = config.outputDir;
  if (!isString(outputDir)) {
    throw new CliError('outputDir config must be a non-empty string');
  }
  if (Path.isAbsolute(outputDir)) {
    throw new CliError(`outputDir [${outputDir}] must be a relative path`);
  }

  const tsconfigPath = config.tsconfigPath;
  if (!isString(tsconfigPath)) {
    throw new CliError('tsconfigPath config must be a non-empty string');
  }
  if (Path.isAbsolute(tsconfigPath)) {
    throw new CliError(`tsconfigPath [${tsconfigPath}] must be a relative path`);
  }

  const inputPath = config.inputPath;
  if (!isString(inputPath)) {
    throw new CliError('inputPath config must be a non-empty string');
  }
  if (Path.isAbsolute(inputPath)) {
    throw new CliError(`inputPath [${inputPath}] must be a relative path`);
  }

  const buildFilePath = config.buildFilePath;
  if (!isString(buildFilePath)) {
    throw new CliError('buildFilePath config must be a non-empty string');
  }
  if (Path.isAbsolute(buildFilePath)) {
    throw new CliError(`buildFilePath [${buildFilePath}] must be a relative path`);
  }

  const repoRelativePackageDir = Path.dirname(buildFilePath);

  return {
    packageName,
    outputDir: Path.resolve(outputDir),
    tsconfigPath: Path.resolve(tsconfigPath),
    inputPath: Path.resolve(inputPath),
    repoRelativePackageDir,
    use: TYPE_SUMMARIZER_PACKAGES.includes(packageName) ? 'type-summarizer' : 'api-extractor',
  };
}

export function parseBazelCliConfig(argv: string[]) {
  if (typeof argv[0] === 'string' && argv[0].startsWith('{')) {
    return parseBazelCliJson(argv[0]);
  }
  return parseBazelCliFlags(argv);
}
