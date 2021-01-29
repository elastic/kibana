/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { join } from 'path';
const childProcessModule = jest.requireActual('child_process');
const fsModule = jest.requireActual('fs');

export const mockedRootDir = '/root';

export const packageMock = {
  raw: {} as any,
};
jest.doMock(join(mockedRootDir, 'package.json'), () => packageMock.raw, { virtual: true });

export const devConfigMock = {
  raw: {} as any,
};
jest.doMock(join(mockedRootDir, 'config', 'apm.dev.js'), () => devConfigMock.raw, {
  virtual: true,
});

export const gitRevExecMock = jest.fn();
jest.doMock('child_process', () => ({
  ...childProcessModule,
  execSync: (command: string, options: any) => {
    if (command.startsWith('git rev-parse')) {
      return gitRevExecMock(command, options);
    }
    return childProcessModule.execSync(command, options);
  },
}));

export const readUuidFileMock = jest.fn();
jest.doMock('fs', () => ({
  ...fsModule,
  readFileSync: (path: string, options: any) => {
    if (path.endsWith('uuid')) {
      return readUuidFileMock(path, options);
    }
    return fsModule.readFileSync(path, options);
  },
}));

export const resetAllMocks = () => {
  packageMock.raw = {};
  devConfigMock.raw = {};
  gitRevExecMock.mockReset();
  readUuidFileMock.mockReset();
  jest.resetModules();
};
