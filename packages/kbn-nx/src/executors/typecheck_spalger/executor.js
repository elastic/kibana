/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Path = require('path');
const Fs = require('fs');
const ts = require('typescript');
const execa = require('execa');

/**
 * @type {Record<string, string[]>|undefined}
 */
let pathsToBuiltTypes;

/**
 * @param {string} path
 */
function readTsconfig(path) {
  const start = Date.now();
  const json = ts.readConfigFile(path, ts.sys.readFile);
  if (json.error) {
    throw new Error(`Unable to load tsconfig file: ${json.error.messageText}`);
  }
  const ms = Date.now() - start;
  console.log('loaded tsconfig file in', ms, 'ms');

  /** @type {import('./tsconfig_type').SimpleTsConfig} */
  const config = json.config;

  return config;
}

/**
 * @param {string} root
 */
function getPathsToBuiltTypes(root) {
  if (pathsToBuiltTypes) {
    console.warn('baseTsConfig already loaded by another executor in this process');
    return pathsToBuiltTypes;
  }

  const path = Path.resolve(root, 'tsconfig.base.json');
  const paths = readTsconfig(path).compilerOptions?.paths ?? {};
  return (pathsToBuiltTypes ||= Object.fromEntries(
    Object.entries(paths).map(([id, paths]) => {
      return [id, paths.map((p) => p.replace(/(\/\*)?$/, '/target/types$1'))];
    })
  ));
}

/**
 * @param {unknown} _
 * @param {import('@nrwl/devkit').ExecutorContext} context
 * @returns {Promise<{ success: boolean }>}
 */
module.exports = async function buildTypesExecutor(_, context) {
  const project = context.projectsConfigurations.projects[context.projectName ?? ''];
  if (!project) {
    throw new Error(`unable to find project for [${context.projectName}]`);
  }

  const paths = getPathsToBuiltTypes(context.root);
  const typeCheckConfigPath = Path.resolve(project.root, 'tsconfig.type_check.json');

  Fs.writeFileSync(
    typeCheckConfigPath,
    JSON.stringify(
      {
        extends: './tsconfig.json',
        compilerOptions: {
          paths,
          rootDir: '.',
          outDir: 'target/types',
          declaration: true,
          emitDeclarationOnly: true,
          declarationMap: false,
          sourceMap: false,
        },
        exclude: [
          ...(readTsconfig(Path.resolve(project.root, 'tsconfig.json')).exclude ?? []),
          'target/**/*',
          '**/*.test.*',
        ],
      },
      null,
      2
    )
  );

  // clean previous output
  Fs.rmSync(Path.relative(project.root, 'target/types'), { recursive: true, force: true });

  try {
    const start = Date.now();
    await execa(require.resolve('typescript/bin/tsc'), ['--build', typeCheckConfigPath], {
      stdio: ['ignore', 'inherit', 'inherit'],
      cwd: context.root,
    });
    const time = Date.now() - start;
    console.log('tsc built types in', time);

    return { success: true };
  } catch (error) {
    if ('exitCode' in error && typeof error.exitCode === 'number') {
      // process exitted with an exit code, assume that it printed an error message to the terminal
      return {
        success: false,
      };
    }

    throw new Error(`Failed to execute tsc: ${error.stack}`);
  } finally {
    try {
      Fs.unlinkSync(typeCheckConfigPath);
    } catch {
      // noop
    }
  }
};
