/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { join } from 'path';
const childProcessModule = require('child_process');
const fsModule = require('fs');

export const mockedRootDir = '/root';

export const packageMock = {
  raw: {} as any,
};
vi.doMock(join(mockedRootDir, 'package.json'), () => packageMock.raw, { virtual: true });

export const gitRevExecMock = vi.fn();
vi.doMock('child_process', () => {
  const mocked = {
    ...childProcessModule,
    execSync: (command: string, options: any) => {
      if (command.startsWith('git rev-parse')) {
        return gitRevExecMock(command, options);
      }
      return childProcessModule.execSync(command, options);
    },
  };
  return { ...mocked, default: mocked };
});

export const readUuidFileMock = vi.fn();
vi.doMock('fs', () => {
  const mocked = {
    ...fsModule,
    readFileSync: (path: string, options: any) => {
      if (path.endsWith('uuid')) {
        return readUuidFileMock(path, options);
      }
      return fsModule.readFileSync(path, options);
    },
  };
  return { ...mocked, default: mocked };
});

export const resetAllMocks = () => {
  packageMock.raw = {};
  gitRevExecMock.mockReset();
  readUuidFileMock.mockReset();
  vi.resetModules();
};
