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

const realFs = jest.requireActual('fs');
const kibanaPackagePath = resolve(REPO_ROOT, 'package.json');

export const mockPackage = {
  raw: {},
};

jest.doMock('fs', () => ({
  ...realFs,
  readFileSync: (filePath: string, options?: unknown) => {
    if (filePath === kibanaPackagePath) {
      return JSON.stringify(mockPackage.raw);
    }
    return realFs.readFileSync(filePath, options);
  },
}));

const { scanPluginSearchPaths } = jest.requireActual('./scan_plugin_search_paths');
export const scanPluginSearchPathsMock = jest.fn().mockImplementation(scanPluginSearchPaths);
jest.doMock('./scan_plugin_search_paths', () => ({
  scanPluginSearchPaths: scanPluginSearchPathsMock,
}));
