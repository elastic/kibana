/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import { REPO_ROOT } from '@kbn/repo-info';
import execa from 'execa';
import globby from 'globby';
import { run } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';

const PATH_TO_WEBPACK_CLI = 'node_modules/.bin/webpack-cli';

const getTargetDirForPackage = (packageFolder: string) => {
  return path.resolve(REPO_ROOT, 'target', 'build', packageFolder);
};

const getFullOutputPath = (packageFolder: string, commandName: string) => {
  return path.resolve(getTargetDirForPackage(packageFolder), commandName);
};

const envOptions = {
  dist: {
    NODE_ENV: 'production',
  },
  default: {
    NODE_ENV: 'development',
  },
};

let toolingLog: ToolingLog;
run(
  async ({ log, flagsReader, flags }) => {
    toolingLog = log;
    const packagePath = flagsReader.getPositionals()[0];
    const watch = flagsReader.boolean('watch');
    const dist = flagsReader.boolean('dist');
    const taskName = flagsReader.string('task-name') || 'build';
    const quiet = flags.quiet || flags.silent;

    const packageRoot = path.resolve(REPO_ROOT, packagePath);

    if (!fs.existsSync(packageRoot)) {
      throw new Error(`Package not found at ${packageRoot}`);
    }

    await buildPackage({ packageRoot, watch, dist, quiet, taskName }, log);
  },
  {
    description: 'Build a package',
    flags: {
      boolean: ['watch', 'dist'],
      string: ['task-name'],
      help: `
      --task-name A task name, used as a sub-directory for the webpack output
      --watch  Watch for changes and rebuild
      --dist   Build for production
    `,
    },
  }
)
  .then(() => {})
  .catch((e) => {
    toolingLog.error(e.message);
    throw e;
  });

async function buildPackage(
  {
    packageRoot,
    watch,
    dist,
    quiet,
    taskName,
  }: { packageRoot: string; watch?: boolean; dist?: boolean; quiet?: boolean; taskName: string },
  log: ToolingLog
) {
  const packageConfig = JSON.parse(
    fs.readFileSync(path.resolve(packageRoot, 'package.json')).toString()
  );
  const packageName = packageConfig.name;
  const packageRelPath = path.relative(REPO_ROOT, packageRoot);
  const srcs = packageConfig.buildSourcePaths;

  const outPath = getFullOutputPath(packageRelPath, taskName);
  const webpackArgs = [
    '--config',
    path.resolve(packageRoot, 'webpack.config.js'),
    '--output-path',
    outPath,
  ];

  const isDist =
    dist ||
    process.env?.NODE_ENV?.toLowerCase()?.match(/^prod/) ||
    process.env?.DIST?.toLowerCase() === 'true';
  const env = isDist ? envOptions.dist : envOptions.default;

  if (watch) {
    webpackArgs.push('--watch', '--stats=minimal');
  } else {
    webpackArgs.push('--stats=errors-only');
  }

  await copySources({
    log,
    root: packageRoot,
    targetDir: getTargetDirForPackage(packageRelPath),
    files: srcs,
  });

  if (watch) {
    log.info(`watching ${packageName}`);
  } else {
    log.info(`building ${packageName}`);
  }

  try {
    await execa(PATH_TO_WEBPACK_CLI, webpackArgs, {
      stdio: quiet ? 'pipe' : 'inherit',
      env: { ...process.env, ...env },
      cwd: REPO_ROOT,
    });
    log.success(`build successful for ${packageName}.`);
  } catch (e) {
    log.error(`webpack build failed for ${packageName}: ${e}`);
    throw e;
  }
}

async function copySources({
  log,
  root,
  targetDir,
  files,
}: {
  log: ToolingLog;
  root: string;
  targetDir: string;
  files: { include: string[]; exclude?: string[] };
}) {
  const allFiles = globby.sync(files.include, {
    cwd: root,
    ignore: files.exclude,
    dot: false,
    absolute: false,
  });
  log.debug(`Copying ${allFiles.length} files`);

  const copyPromises = [];
  for (const file of allFiles) {
    const targetFilePath = path.resolve(targetDir, file);
    const sourceFilePath = path.resolve(root, file);
    log.debug(`Copying ${sourceFilePath} to ${targetFilePath}`);
    fs.mkdirSync(path.dirname(targetFilePath), { recursive: true });
    copyPromises.push(fsp.copyFile(sourceFilePath, targetFilePath));
  }
  await Promise.all(copyPromises);
}
