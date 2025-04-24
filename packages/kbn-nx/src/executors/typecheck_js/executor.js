/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable import/no-default-export */

const fs = require('fs');
const path = require('path');
const execa = require('execa');
const { REPO_ROOT } = require('@kbn/repo-info');
const ts = require('typescript');

const pathToTsc = require.resolve('typescript/bin/tsc');

module.exports = async function typecheckExecutor(options, context) {
  if (!context.projectName) {
    throw new Error('Project name not present in project.json - please add that field.');
  }

  // const projectConfig = context.projectsConfigurations.projects[context.projectName];
  // const projectRoot = projectConfig.root;

  // if (options.cleanOnly) {
  //   const targetDir = path.join(REPO_ROOT, projectRoot, 'target');
  //   if (fs.existsSync(targetDir)) {
  //     console.info('Cleaning target directory: ' + targetDir);
  //     fs.rmSync(targetDir, { recursive: true });
  //   }
  //   return { success: true };
  // }

  const tempConfigPath = writeTempTypecheckConfig(context);

  console.info('Starting typecheck for project: ' + context.projectName);
  const startTime = Date.now();

  let success;
  try {
    const { exitCode, stdout, stderr } = await execa(
      'node',
      [pathToTsc, '--build', tempConfigPath],
      {
        env: {
          NODE_OPTIONS: '--max-old-space-size=4096',
        },
        cwd: REPO_ROOT,
        stdio: 'inherit',
      }
    );

    const typecheckTime = Date.now() - startTime;
    // writeStats('node, no-tsbuild-2', typecheckTime, context.projectName);
    if (exitCode !== 0) {
      console.error(`Typecheck failed for ${context.projectName} after ${typecheckTime}ms`);
      console.error(stderr);
      success = false;
    } else {
      console.info(`Typecheck successful for ${context.projectName} in ${typecheckTime}ms`);
      if (stdout) {
        console.info(stdout);
      }
      success = true;
    }
  } catch (e) {
    console.error('Error while running type check.');
    console.error(e?.stdout ?? e.message);
    success = false;
  }

  try {
    if (success) {
      fs.rmSync(tempConfigPath, { force: true });
    } else {
      console.warn(`Leaving '${tempConfigPath}' present due to error.`);
    }
  } catch (e) {
    console.error(e);
    // ignore
  }

  return { success };
};

// function writeStats(postfix, time, projectName) {
//   const postfixSlug = postfix.replace(/[^a-z0-9]/gi, '_').toLowerCase();
//   const statsPath = path.resolve(REPO_ROOT, 'target', `typecheck-stats-${postfixSlug}.json`);
//   fs.appendFileSync(statsPath, JSON.stringify({ time, projectName }) + '\n');
// }

function writeTempTypecheckConfig(context) {
  const paths = getPathsToBuiltTypes(context.root);
  const project = context.projectsConfigurations.projects[context.projectName];
  const tempTypecheckConfigPath = getTempTypecheckPath(project.root);

  const projectTsConfigPath = path.resolve(project.root, 'tsconfig.json');
  const projectTsConfig = readTsconfig(projectTsConfigPath);

  fs.writeFileSync(
    tempTypecheckConfigPath,
    JSON.stringify(
      {
        extends: './tsconfig.json',
        compilerOptions: {
          tsBuildInfoFile: 'target/types/tsconfig.type_check.tsbuildinfo',
          paths,
          rootDir: '.',
          outDir: 'target/types',
          declaration: true,
          emitDeclarationOnly: true,
          declarationMap: false,
          sourceMap: false,
        },
        exclude: [...(projectTsConfig.exclude ?? []), 'target/**/*', '**/*.test.*'],
      },
      null,
      2
    )
  );

  return tempTypecheckConfigPath;
}

let pathsToBuiltTypes;

function getPathsToBuiltTypes(workspaceRoot) {
  if (pathsToBuiltTypes) {
    console.warn('baseTsConfig already loaded by another executor in this process');
    return pathsToBuiltTypes;
  }

  const pathToBaseConfig = path.resolve(workspaceRoot, 'tsconfig.base.json');
  const paths = readTsconfig(pathToBaseConfig).compilerOptions?.paths ?? {};
  return (pathsToBuiltTypes ||= Object.fromEntries(
    Object.entries(paths).map(([id, paths]) => {
      return [id, paths.map((p) => p.replace(/(\/\*)?$/, '/target/types$1'))];
    })
  ));
}

function readTsconfig(path) {
  const json = ts.readConfigFile(path, ts.sys.readFile);
  if (json.error) {
    throw new Error(`Unable to load tsconfig file: ${json.error.messageText}`);
  }
  /** @type {import('./tsconfig_type').SimpleTsConfig} */
  const config = json.config;

  return config;
}

function getTempTypecheckPath(projectRoot) {
  return path.resolve(projectRoot, 'tsconfig.nx_type_check.json');
}
