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

const useRspack = process.env.KBN_USE_RSPACK === 'true' || process.env.KBN_USE_RSPACK === '1';

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

  const isDist =
    dist ||
    process.env?.NODE_ENV?.toLowerCase()?.match(/^prod/) ||
    process.env?.DIST?.toLowerCase() === 'true';
  const env = isDist ? envOptions.dist : envOptions.default;

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

  // [rspack-transition] Use rspack programmatic API when KBN_USE_RSPACK is set
  // and the package has a rspack.config.js. Falls through to webpack-cli otherwise.
  const rspackConfigPath = path.resolve(packageRoot, 'rspack.config.js');
  if (useRspack && fs.existsSync(rspackConfigPath)) {
    await buildWithRspack({ packageName, rspackConfigPath, outPath, env, watch, quiet }, log);
  } else {
    await buildWithWebpack({ packageRoot, packageName, outPath, env, watch, quiet }, log);
  }
}

async function buildWithRspack(
  {
    packageName,
    rspackConfigPath,
    outPath,
    env,
    watch,
    quiet,
  }: {
    packageName: string;
    rspackConfigPath: string;
    outPath: string;
    env: Record<string, string>;
    watch?: boolean;
    quiet?: boolean;
  },
  log: ToolingLog
) {
  Object.assign(process.env, env);

  // Load the rspack config (supports both object and function exports)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const configModule = require(rspackConfigPath);
  const config =
    typeof configModule === 'function' ? configModule({}, { outputPath: outPath }) : configModule;

  // Override output path (mirrors webpack-cli --output-path behavior)
  config.output = config.output || {};
  config.output.path = outPath;

  const { rspack } = await import('@rspack/core');

  return new Promise<void>((resolve, reject) => {
    const compiler = rspack(config);

    if (watch) {
      compiler.watch({}, (err, stats) => {
        if (err) {
          log.error(`rspack watch error for ${packageName}: ${err}`);
          return;
        }
        if (stats) {
          if (stats.hasErrors()) {
            const info = stats.toJson('errors-only');
            for (const e of info.errors || []) {
              log.error(e.message);
            }
          }
          if (!quiet) {
            log.info(stats.toString({ preset: 'minimal', colors: true }));
          }
        }
      });
    } else {
      compiler.run((err, stats) => {
        if (err) {
          reject(new Error(`rspack build failed for ${packageName}: ${err}`));
          return;
        }

        if (stats) {
          if (!quiet) {
            log.info(stats.toString({ preset: 'errors-warnings', colors: true }));
          }

          if (stats.hasErrors()) {
            const info = stats.toJson('errors-only');
            const messages = (info.errors || []).map((e) => e.message).join('\n');
            reject(new Error(`rspack build failed for ${packageName}:\n${messages}`));
            return;
          }
        }

        compiler.close((closeErr) => {
          if (closeErr) {
            log.warning(`rspack compiler close warning for ${packageName}: ${closeErr}`);
          }
          log.success(`rspack build successful for ${packageName}.`);
          resolve();
        });
      });
    }
  });
}

async function buildWithWebpack(
  {
    packageRoot,
    packageName,
    outPath,
    env,
    watch,
    quiet,
  }: {
    packageRoot: string;
    packageName: string;
    outPath: string;
    env: Record<string, string>;
    watch?: boolean;
    quiet?: boolean;
  },
  log: ToolingLog
) {
  const webpackArgs = [
    '--config',
    path.resolve(packageRoot, 'webpack.config.js'),
    '--output-path',
    outPath,
  ];

  if (watch) {
    webpackArgs.push('--watch', '--stats=minimal');
  } else {
    webpackArgs.push('--stats=errors-only');
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
