/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
