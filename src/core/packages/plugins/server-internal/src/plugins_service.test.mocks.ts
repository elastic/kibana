/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { resolve } from 'path';

const loadJsonFile = jest.requireActual('load-json-file');
const kibanaPackagePath = resolve(REPO_ROOT, 'package.json');

export const mockPackage = {
  raw: { __dirname: '/tmp', name: 'kibana' } as any,
};

jest.doMock('load-json-file', () => ({
  ...loadJsonFile,
  sync: (path: string) => {
    if (path === kibanaPackagePath) {
      return mockPackage.raw;
    }
    return loadJsonFile.sync(path);
  },
}));

export const mockDiscover = jest.fn();
jest.mock('./discovery/plugins_discovery', () => ({ discover: mockDiscover }));

jest.mock('./plugins_system');
