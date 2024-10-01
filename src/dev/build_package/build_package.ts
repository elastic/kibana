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
import { ToolingLog } from '@kbn/tooling-log';

run(async ({ log, flags, flagsReader }) => {
  const packagePath = flagsReader.getPositionals()[0];

  const packageRoot = path.resolve(REPO_ROOT, packagePath);

  if (!fs.existsSync(packageRoot)) {
    throw new Error(`Package not found at ${packageRoot}`);
  }

  await buildPackage(packageRoot, log);
})
  .then(() => {})
  .catch((e) => {});

async function buildPackage(packageRoot: string, log: ToolingLog) {
  const packageConfig = JSON.parse(
    fs.readFileSync(path.resolve(packageRoot, 'package.json')).toString()
  );
  const packageName = packageConfig.name;
  const packageFolder = path.basename(packageRoot);
  const buildFile = JSON.parse(fs.readFileSync(path.resolve(packageRoot, 'build.json')).toString());
  const webpackBuildOptions: any = buildFile.webpack_cli;
  const webpackArgs: string[] = webpackBuildOptions.args;
  const commandName: string = webpackBuildOptions.name;

  let env = webpackBuildOptions.env.default;
  if (
    process.env?.NODE_ENV?.toLowerCase()?.match(/^prod/) ||
    process.env?.DIST?.toLowerCase() === 'true'
  ) {
    env = webpackBuildOptions.env.dist;
  }

  // TODO: this location looks weird, why bazel-bin?
  const outPath = path.resolve(REPO_ROOT, 'bazel-bin', 'packages', packageFolder, commandName);

  const argsProcessed = webpackArgs.map((arg) => {
    if (arg.match(/^\$\(location (.*)\)$/)) {
      return arg.replace(/^\$\(location (.*)\)$/, (substring, ...args) => {
        return path.resolve(packageRoot, args[0]);
      });
    } else if (arg.match(/^\$\(@D\)$/)) {
      return outPath;
    } else {
      return arg;
    }
  });

  await copySources({
    log,
    root: packageRoot,
    targetDir: path.resolve(REPO_ROOT, 'bazel-bin', 'packages', packageFolder),
    files: buildFile.SRCS,
  });

  log.info(`building packages/${packageName}`);

  return execa('webpack-cli', argsProcessed, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
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
