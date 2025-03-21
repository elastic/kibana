/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExecutorContext } from '@nx/devkit';
import { jestExecutor } from '@nx/jest/src/executors/jest/jest.impl';
import { JestExecutorOptions } from '@nx/jest/src/executors/jest/schema';

// eslint-disable-next-line import/no-default-export
export default async function nxJestExecutor(
  options: JestExecutorOptions,
  context: ExecutorContext
): Promise<{ success: boolean }> {
  const projectName = context.projectName;
  if (!projectName) {
    // console.log('No project name found in context');
  } else {
    const project = context.projectGraph.nodes[projectName];
    const projectRoot = project.data.sourceRoot;

    const jestConfigPath =
      options.jestConfig ||
      project.data.targets?.jest?.options?.jestConfig ||
      `${projectRoot}/jest.config.js`;

    process.env.NX_JEST_CONFIG_PATH = jestConfigPath;
  }
  return await jestExecutor(options, context);
}
