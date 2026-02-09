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

const PATH_TO_VITE = 'node_modules/.bin/vite';

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
      --task-name A task name, used as a sub-directory for the output
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

  const isDist =
    dist ||
    process.env?.NODE_ENV?.toLowerCase()?.match(/^prod/) ||
    process.env?.DIST?.toLowerCase() === 'true';
  const env = isDist ? envOptions.dist : envOptions.default;

  // Check if package has a vite.config.ts (Rolldown build) or falls back to webpack
  const hasViteConfig = fs.existsSync(path.resolve(packageRoot, 'vite.config.ts'));

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

  if (hasViteConfig) {
    // Use Vite/Rolldown for the build
    await buildWithVite({ packageRoot, packageName, outPath, watch, quiet, env }, log);
  } else {
    // Fallback to webpack for packages that haven't been migrated yet
    await buildWithWebpack({ packageRoot, packageName, outPath, watch, quiet, env }, log);
  }
}

/**
 * Monaco worker languages — each worker is built as a separate IIFE bundle
 * because Kibana loads workers via classic `new Worker(url)`.
 */
const MONACO_WORKER_LANGUAGES = ['default', 'json', 'xjson', 'painless', 'yaml', 'console'];

async function buildWithVite(
  {
    packageRoot,
    packageName,
    outPath,
    watch,
    quiet,
    env,
  }: {
    packageRoot: string;
    packageName: string;
    outPath: string;
    watch?: boolean;
    quiet?: boolean;
    env: Record<string, string>;
  },
  log: ToolingLog
) {
  const mode = env.NODE_ENV === 'production' ? 'production' : 'development';
  const viteConfigPath = path.resolve(packageRoot, 'vite.config.ts');

  // For @kbn/monaco, build each worker language separately
  // (workers must be self-contained IIFEs, no code splitting)
  if (packageName === '@kbn/monaco') {
    for (const lang of MONACO_WORKER_LANGUAGES) {
      log.info(`  building ${lang} worker...`);
      await runViteBuild({
        viteConfigPath,
        outPath,
        mode,
        watch,
        quiet,
        env,
        extraEnv: { WORKER_LANG: lang },
      });
    }
    log.success(`Vite/Rolldown build successful for ${packageName} (${MONACO_WORKER_LANGUAGES.length} workers).`);
    return;
  }

  // Standard single build
  await runViteBuild({ viteConfigPath, outPath, mode, watch, quiet, env });
  log.success(`Vite/Rolldown build successful for ${packageName}.`);
}

async function runViteBuild({
  viteConfigPath,
  outPath,
  mode,
  watch,
  quiet,
  env,
  extraEnv = {},
}: {
  viteConfigPath: string;
  outPath: string;
  mode: string;
  watch?: boolean;
  quiet?: boolean;
  env: Record<string, string>;
  extraEnv?: Record<string, string>;
}) {
  const viteArgs = ['build', '--config', viteConfigPath, '--mode', mode];

  if (watch) {
    viteArgs.push('--watch');
  }

  // Register Kibana's TypeScript resolve hooks in the Vite subprocess so that
  // .js → .ts resolution works for packages like @kbn/vite-config that point
  // their exports at raw .ts source files.
  const hooksRegister = path.resolve(REPO_ROOT, 'src/setup_node_env/ts_hooks_register.mjs');
  const existingNodeOptions = process.env.NODE_OPTIONS || '';
  const nodeOptions = `--import ${hooksRegister} ${existingNodeOptions}`.trim();

  try {
    await execa(PATH_TO_VITE, viteArgs, {
      stdio: quiet ? 'pipe' : 'inherit',
      env: {
        ...process.env,
        ...env,
        OUTPUT_PATH: outPath,
        NODE_OPTIONS: nodeOptions,
        ...extraEnv,
      },
      cwd: REPO_ROOT,
    });
  } catch (e) {
    throw new Error(`Vite/Rolldown build failed: ${e}`);
  }
}

async function buildWithWebpack(
  {
    packageRoot,
    packageName,
    outPath,
    watch,
    quiet,
    env,
  }: {
    packageRoot: string;
    packageName: string;
    outPath: string;
    watch?: boolean;
    quiet?: boolean;
    env: Record<string, string>;
  },
  log: ToolingLog
) {
  const PATH_TO_WEBPACK_CLI = 'node_modules/.bin/webpack-cli';
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
    log.success(`webpack build successful for ${packageName}.`);
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
