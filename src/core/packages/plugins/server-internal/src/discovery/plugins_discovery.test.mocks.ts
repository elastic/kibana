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

type ReadFileCallback = (error: Error | null, data?: Buffer) => void;

/** Errors that fs.readFile reports for the given paths, for failures the real file system can't produce reliably. */
export const mockReadFileErrors = new Map<string, Error>();

jest.doMock('fs', () => ({
  ...realFs,
  readFileSync: (filePath: string, options?: unknown) => {
    if (filePath === kibanaPackagePath) {
      return JSON.stringify(mockPackage.raw);
    }
    return realFs.readFileSync(filePath, options);
  },
  readFile: (filePath: string, ...args: Array<string | object | ReadFileCallback | undefined>) => {
    const error = mockReadFileErrors.get(filePath);
    const callback = args[args.length - 1];
    if (error && typeof callback === 'function') {
      process.nextTick(() => callback(error));
      return;
    }
    return realFs.readFile(filePath, ...args);
  },
}));

const { scanPluginSearchPaths } = jest.requireActual('./scan_plugin_search_paths');
export const scanPluginSearchPathsMock = jest.fn().mockImplementation(scanPluginSearchPaths);
jest.doMock('./scan_plugin_search_paths', () => ({
  scanPluginSearchPaths: scanPluginSearchPathsMock,
}));
