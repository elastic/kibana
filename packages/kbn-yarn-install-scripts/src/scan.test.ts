/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import type { Dirent } from 'fs';

import { scanInstallScripts } from './scan';

jest.mock('fs');
jest.mock('@kbn/repo-info', () => ({ REPO_ROOT: '/mock/kibana' }));

const mockFs = Fs as jest.Mocked<typeof Fs>;
const mockReaddirSync = mockFs.readdirSync as jest.Mock;

function createDirent(name: string, isDir: boolean): Dirent {
  return { name, isDirectory: () => isDir } as Dirent;
}

describe('scanInstallScripts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw when root node_modules folder is missing', () => {
    mockFs.existsSync.mockReturnValue(false);
    expect(() => scanInstallScripts()).toThrow('No node_modules found');
  });

  it('should find packages with postinstall scripts', () => {
    const packageJson = {
      name: '@elastic/eui',
      version: '112.0.0',
      scripts: { postinstall: 'echo' },
    };

    mockReaddirSync
      .mockReturnValueOnce([createDirent('@elastic', true)])
      .mockReturnValueOnce([createDirent('eui', true)]);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(packageJson));
    mockFs.existsSync
      .mockReturnValueOnce(true) // root node_modules
      .mockReturnValueOnce(true) // package.json
      .mockReturnValueOnce(false); // no nested node_modules

    const result = scanInstallScripts();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      name: '@elastic/eui',
      lifecycle: 'postinstall',
      script: 'echo',
    });
  });

  it('should find both install and postinstall scripts', () => {
    const packageJson = {
      name: '@elastic/eui',
      version: '112.0.0',
      scripts: { install: 'echo install', postinstall: 'echo postinstall' },
    };

    mockReaddirSync
      .mockReturnValueOnce([createDirent('@elastic', true)])
      .mockReturnValueOnce([createDirent('eui', true)]);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(packageJson));
    mockFs.existsSync
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const result = scanInstallScripts();

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.lifecycle)).toEqual(['install', 'postinstall']);
  });

  it('should scan multiple packages', () => {
    const euiPkg = {
      name: '@elastic/eui',
      version: '112.0.0',
      scripts: { postinstall: 'echo eui' },
    };
    const chartsPkg = {
      name: '@elastic/charts',
      version: '71.1.2',
      scripts: { postinstall: 'echo charts' },
    };

    mockReaddirSync
      .mockReturnValueOnce([createDirent('@elastic', true)])
      .mockReturnValueOnce([createDirent('eui', true), createDirent('charts', true)]);
    mockFs.readFileSync
      .mockReturnValueOnce(JSON.stringify(euiPkg))
      .mockReturnValueOnce(JSON.stringify(chartsPkg));
    mockFs.existsSync
      .mockReturnValueOnce(true) // root node_modules
      .mockReturnValueOnce(true) // eui pkg.json
      .mockReturnValueOnce(false) // eui nested node_modules
      .mockReturnValueOnce(true) // charts pkg.json
      .mockReturnValueOnce(false); // charts nested node_modules

    const result = scanInstallScripts();

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name)).toContain('@elastic/eui');
    expect(result.map((r) => r.name)).toContain('@elastic/charts');
  });

  it('should return empty array when no packages have install scripts', () => {
    const packageJson = { name: '@elastic/eui', version: '112.0.0', scripts: {} };

    mockReaddirSync
      .mockReturnValueOnce([createDirent('@elastic', true)])
      .mockReturnValueOnce([createDirent('eui', true)]);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(packageJson));
    mockFs.existsSync
      .mockReturnValueOnce(true) // root node_modules
      .mockReturnValueOnce(true) // eui pkg.json
      .mockReturnValueOnce(false); // eui nested node_modules

    const result = scanInstallScripts();
    expect(result).toEqual([]);
  });

  it('should throw when package.json is missing name', () => {
    const packageJson = { version: '112.0.0', scripts: { postinstall: 'echo' } };

    mockReaddirSync
      .mockReturnValueOnce([createDirent('@elastic', true)])
      .mockReturnValueOnce([createDirent('eui', true)]);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(packageJson));
    mockFs.existsSync.mockReturnValueOnce(true).mockReturnValueOnce(true);

    expect(() => scanInstallScripts()).toThrow('missing required name or version field');
  });

  it('should throw when package.json is missing version', () => {
    const packageJson = { name: '@elastic/eui', scripts: { postinstall: 'echo' } };
    mockReaddirSync
      .mockReturnValueOnce([createDirent('@elastic', true)])
      .mockReturnValueOnce([createDirent('eui', true)]);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(packageJson));
    mockFs.existsSync.mockReturnValueOnce(true).mockReturnValueOnce(true);

    expect(() => scanInstallScripts()).toThrow('missing required name or version field');
  });

  it('should throw when package.json is invalid JSON', () => {
    mockReaddirSync
      .mockReturnValueOnce([createDirent('@elastic', true)])
      .mockReturnValueOnce([createDirent('eui', true)]);
    mockFs.readFileSync.mockReturnValue('{ invalid }');
    mockFs.existsSync.mockReturnValueOnce(true).mockReturnValueOnce(true);

    expect(() => scanInstallScripts()).toThrow();
  });

  it('should scan nested node_modules directories', () => {
    const parentPkg = {
      name: '@elastic/eui',
      version: '112.0.0',
      scripts: { postinstall: 'echo parent' },
    };
    const nestedPkg = {
      name: '@elastic/charts',
      version: '71.1.2',
      scripts: { postinstall: 'echo nested' },
    };

    mockReaddirSync
      // root node_modules -> @elastic scope
      .mockReturnValueOnce([createDirent('@elastic', true)])
      // @elastic scope in root -> eui package
      .mockReturnValueOnce([createDirent('eui', true)])
      // eui's nested node_modules -> @elastic scope
      .mockReturnValueOnce([createDirent('@elastic', true)])
      // @elastic scope in nested -> charts package
      .mockReturnValueOnce([createDirent('charts', true)]);

    mockFs.readFileSync
      .mockReturnValueOnce(JSON.stringify(parentPkg))
      .mockReturnValueOnce(JSON.stringify(nestedPkg));

    mockFs.existsSync
      .mockReturnValueOnce(true) // root node_modules exists
      .mockReturnValueOnce(true) // eui package.json exists
      .mockReturnValueOnce(true) // eui has nested node_modules
      .mockReturnValueOnce(true) // charts package.json exists
      .mockReturnValueOnce(false); // charts has no nested node_modules

    const result = scanInstallScripts();

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name)).toContain('@elastic/eui');
    expect(result.map((r) => r.name)).toContain('@elastic/charts');
  });
});
