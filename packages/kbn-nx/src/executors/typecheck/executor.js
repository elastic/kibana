/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable import/no-default-export */

const path = require('path');
const execa = require('execa');
const { REPO_ROOT } = require('@kbn/repo-info');

const pathToTsc = require.resolve('typescript/bin/tsc');

module.exports = async function typecheckExecutor(options, context) {
  console.info('Starting typecheck for project: ' + context.projectName);
  const startTime = Date.now();

  let success;
  const project = context.projectsConfigurations.projects[context.projectName];
  const pathToProject = path.join(project.sourceRoot, 'tsconfig.type_check.json');
  try {
    const { exitCode, stdout, stderr } = await execa(
      'node',
      [pathToTsc, '--build', pathToProject, '--pretty'],
      {
        env: {
          NODE_OPTIONS: '--max-old-space-size=8096',
        },
        cwd: REPO_ROOT,
        stdio: 'inherit',
      }
    );

    if (exitCode !== 0) {
      success = false;
      if (stdout) {
        console.log(stdout);
      }
      console.error(stderr);
    } else {
      success = true;
    }
  } catch (error) {
    success = false;
    console.error(`Typecheck failed for ${context.projectName}: ${error.message}`);
  }

  console.log(
    `Typecheck ${success ? 'succeeded' : 'failed'} for ${context.projectName} in ${
      Date.now() - startTime
    }ms`
  );
  return { success };
};
