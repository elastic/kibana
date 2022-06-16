/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fsp from 'fs/promises';
import Path from 'path';

import { asyncMapWithLimit } from '@kbn/std';

import { GroupedTestFiles } from './group_test_files';

export const UNIT_CONFIG_NAME = 'jest.config.js';
export const INTEGRATION_CONFIG_NAME = 'jest.integration.config.js';

async function isFile(path: string) {
  try {
    const stats = await Fsp.stat(path);
    return stats.isFile();
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

export async function findMissingConfigFiles(groups: GroupedTestFiles) {
  const expectedConfigs = [...groups].flatMap(([owner, tests]) => {
    const configs: string[] = [];
    if (tests.unit?.length) {
      configs.push(Path.resolve(owner.path, UNIT_CONFIG_NAME));
    }
    if (tests.integration?.length) {
      configs.push(Path.resolve(owner.path, INTEGRATION_CONFIG_NAME));
    }
    return configs;
  });

  return (
    await asyncMapWithLimit(expectedConfigs, 20, async (path) =>
      !(await isFile(path)) ? [path] : []
    )
  ).flat();
}
