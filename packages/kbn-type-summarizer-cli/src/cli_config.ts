/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';

import { CliError, Path } from '@kbn/type-summarizer-core';
import { parseCliFlags } from './cli_flags';

const isString = (i: any): i is string => typeof i === 'string' && i.length > 0;

interface CliConfig {
  packageName: string;
  outputDir: string;
  tsconfigPath: string;
  inputPath: string;
  repoRelativePackageDir: string;
  dump: boolean;
}

function isKibanaRepo(dir: string) {
  try {
    const json = Fs.readFileSync(Path.join(dir, 'package.json'), 'utf8');
    const parsed = JSON.parse(json);
    return parsed.name === 'kibana';
  } catch {
    return false;
  }
}

export function findRepoRoot() {
  const start = Path.resolve(__dirname);
  let dir = start;
  while (true) {
    if (isKibanaRepo(dir)) {
      return dir;
    }

    // this is not the kibana directory, try moving up a directory
    const parent = Path.join(dir, '..');
    if (parent === dir) {
      throw new Error(
        `unable to find Kibana's package.json file when traversing up from [${start}]`
      );
    }

    dir = parent;
  }
}

function parseConfigFromFlags(argv: string[]): CliConfig {
  const { rawFlags, unknownFlags } = parseCliFlags(argv, {
    boolean: ['dump'],
  });

  if (unknownFlags.length) {
    throw new CliError(`Unknown flags: ${unknownFlags.join(', ')}`, {
      showHelp: true,
    });
  }

  const repoRoot = findRepoRoot();

  const [relativePackagePath, ...extraPositional] = rawFlags._;
  if (typeof relativePackagePath !== 'string') {
    throw new CliError(`missing path to package as first positional argument`, { showHelp: true });
  }
  if (extraPositional.length) {
    throw new CliError(`extra positional arguments`, { showHelp: true });
  }

  const packageDir = Path.resolve(relativePackagePath);
  const packageName: string = JSON.parse(
    Fs.readFileSync(Path.join(packageDir, 'package.json'), 'utf8')
  ).name;
  const repoRelativePackageDir = Path.relative(repoRoot, packageDir);

  const dump = !!rawFlags.dump;

  return {
    packageName,
    tsconfigPath: Path.join(repoRoot, repoRelativePackageDir, 'tsconfig.json'),
    inputPath: Path.join(repoRoot, 'node_modules', packageName, 'target_types/index.d.ts'),
    repoRelativePackageDir,
    outputDir: Path.join(repoRoot, 'data/type-summarizer-output'),
    dump,
  };
}

function parseJsonFromCli(json: string) {
  try {
    return JSON.parse(json);
  } catch (error) {
    // TODO: This is to handle a bug in Bazel which escapes `"` in .bat arguments incorrectly, replacing them with `\`
    if (
      error.message === 'Unexpected token \\ in JSON at position 1' &&
      process.platform === 'win32'
    ) {
      const unescapedJson = json.replaceAll('\\', '"');
      try {
        return JSON.parse(unescapedJson);
      } catch (e) {
        throw new CliError(
          `unable to parse first positional argument as JSON: "${e.message}"\n  unescaped value: ${unescapedJson}\n  raw value: ${json}`
        );
      }
    }

    throw new CliError(
      `unable to parse first positional argument as JSON: "${error.message}"\n  value: ${json}`
    );
  }
}

function parseConfigFromJson(json: string): CliConfig {
  const config = parseJsonFromCli(json);
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

  return {
    packageName,
    outputDir: Path.resolve(outputDir),
    tsconfigPath: Path.resolve(tsconfigPath),
    inputPath: Path.resolve(inputPath),
    repoRelativePackageDir: Path.dirname(buildFilePath),
    dump: false,
  };
}

export function parseCliConfig(argv: string[]): CliConfig {
  if (typeof argv[0] === 'string' && argv[0].startsWith('{')) {
    return parseConfigFromJson(argv[0]);
  }
  return parseConfigFromFlags(argv);
}
