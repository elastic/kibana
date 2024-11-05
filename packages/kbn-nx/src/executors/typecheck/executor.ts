/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable import/no-default-export */
/* eslint-disable no-console */

import type { ExecutorContext } from '@nx/devkit';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export default async function typecheckExecutor(
  options: {},
  context: ExecutorContext
): Promise<{ success: boolean }> {
  if (!context.projectName) {
    throw new Error('Project name not present in project.json - please add that field.');
  }

  const workspaceRoot = context.root;
  const projectConfig = context.projectsConfigurations.projects[context.projectName];
  const projectRoot = projectConfig.root;
  const assumedProjectTsConfig = path.join(projectRoot, 'tsconfig.json');

  if (!fs.existsSync(assumedProjectTsConfig)) {
    throw new Error(`No tsconfig.json found at ${assumedProjectTsConfig}`);
  }

  // Generate typescript type_check config

  try {
    execSync(
      `node ${context.root}/scripts/type_check.js --configs-only --project ${assumedProjectTsConfig}`
    );
  } catch (e) {
    console.error('Error while generating tsconfig.type_check.json - ', e);
    throw e;
  }

  // Run type check
  let success = true;
  try {
    const stdout = execSync(
      `node ${context.root}/scripts/type_check.js --project ${assumedProjectTsConfig}`,
      {
        stdio: 'pipe',
        encoding: 'utf-8',
        cwd: workspaceRoot,
      }
    );
    console.log(`Typecheck successful for ${context.projectName}`);
    console.log(stdout);
  } catch (e) {
    console.error('Error while running type check.');
    console.error(e?.stdout ?? e.message);
    success = false;
  }

  return { success };
}
