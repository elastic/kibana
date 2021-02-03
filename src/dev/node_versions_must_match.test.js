/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import fs from 'fs';
import { engines } from '../../package.json';
import { promisify } from 'util';
const readFile = promisify(fs.readFile);

describe('All configs should use a single version of Node', () => {
  it('should compare .node-version and .nvmrc', async () => {
    const [nodeVersion, nvmrc] = await Promise.all([
      readFile('./.node-version', { encoding: 'utf-8' }),
      readFile('./.nvmrc', { encoding: 'utf-8' }),
    ]);

    expect(nodeVersion.trim()).toBe(nvmrc.trim());
  });

  it('should compare .node-version and engines.node from package.json', async () => {
    const nodeVersion = await readFile('./.node-version', {
      encoding: 'utf-8',
    });
    expect(nodeVersion.trim()).toBe(engines.node);
  });
});
