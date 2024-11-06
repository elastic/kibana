/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import fs from 'fs';
import { ToolingLog } from '@kbn/tooling-log';
import { checkProdNativeModules } from '../check_prod_native_modules';

describe('checkProdNativeModules', () => {
  let mockLog: jest.Mocked<ToolingLog>;
  const fixturesDir = path.join(__dirname, '__fixtures__');

  beforeEach(() => {
    mockLog = {
      info: jest.fn(),
      success: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<ToolingLog>;

    jest.clearAllMocks();
  });

  it('should return false when no native modules are found', async () => {
    // Use a fixture without native modules
    const noNativeModulesDir = path.join(fixturesDir, 'no_native_modules');
    const noNativeModulesPkgJsonPath = path.join(noNativeModulesDir, 'package.json');
    jest.spyOn(process, 'cwd').mockReturnValue(noNativeModulesDir);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    jest.replaceProperty(require('@kbn/repo-info'), 'REPO_ROOT', noNativeModulesDir);

    const noNativeModulesPkgJson = JSON.parse(fs.readFileSync(noNativeModulesPkgJsonPath, 'utf8'));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    jest.replaceProperty(require('@kbn/repo-info'), 'kibanaPackageJson', noNativeModulesPkgJson);

    const result = await checkProdNativeModules(mockLog);

    expect(result).toBe(false);
    expect(mockLog.success).toHaveBeenCalledWith(
      'No production native modules installed were found'
    );
  });

  it('should return true and log errors when native modules are found', async () => {
    // Use a fixture with native modules
    const withNativeModulesDir = path.join(fixturesDir, 'with_native_modules');
    const withNativeModulesPkgJsonPath = path.join(withNativeModulesDir, 'package.json');
    jest.spyOn(process, 'cwd').mockReturnValue(withNativeModulesDir);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    jest.replaceProperty(require('@kbn/repo-info'), 'REPO_ROOT', withNativeModulesDir);

    const withNativeModulesPkgJson = JSON.parse(
      fs.readFileSync(withNativeModulesPkgJsonPath, 'utf8')
    );
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    jest.replaceProperty(require('@kbn/repo-info'), 'kibanaPackageJson', withNativeModulesPkgJson);

    const result = await checkProdNativeModules(mockLog);

    expect(result).toBe(true);
    expect(mockLog.error).toHaveBeenCalledWith(
      expect.stringContaining('Production native module detected:')
    );
    expect(mockLog.error).toHaveBeenCalledWith(
      'Production native modules were detected and logged above'
    );
  });

  it('should throw an error when root node_modules folder is not found', async () => {
    // Use a fixture without node_modules
    const noNodeModulesDir = path.join(fixturesDir, 'no_node_modules');
    const noNodeModulesPkgJsonPath = path.join(noNodeModulesDir, 'package.json');
    jest.spyOn(process, 'cwd').mockReturnValue(noNodeModulesDir);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    jest.replaceProperty(require('@kbn/repo-info'), 'REPO_ROOT', noNodeModulesDir);

    const noNodeModulesPkgJson = JSON.parse(fs.readFileSync(noNodeModulesPkgJsonPath, 'utf8'));
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    jest.replaceProperty(require('@kbn/repo-info'), 'kibanaPackageJson', noNodeModulesPkgJson);

    expect(await checkProdNativeModules(mockLog)).toBe(true);
    expect(mockLog.error).toHaveBeenCalledWith(
      'No root node_modules folder was found in the project. Impossible to continue'
    );
  });

  it('should return false when no prod native modules are found', async () => {
    // Use a fixture without native modules
    const withDevNativeModulesDir = path.join(fixturesDir, 'with_dev_native_modules');
    const withDevNativeModulesPkgJsonPath = path.join(withDevNativeModulesDir, 'package.json');
    jest.spyOn(process, 'cwd').mockReturnValue(withDevNativeModulesDir);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    jest.replaceProperty(require('@kbn/repo-info'), 'REPO_ROOT', withDevNativeModulesDir);

    const withDevNativeModulesPkgJson = JSON.parse(
      fs.readFileSync(withDevNativeModulesPkgJsonPath, 'utf8')
    );

    jest.replaceProperty(
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@kbn/repo-info'),
      'kibanaPackageJson',
      withDevNativeModulesPkgJson
    );

    const result = await checkProdNativeModules(mockLog);

    expect(result).toBe(false);
    expect(mockLog.success).toHaveBeenCalledWith(
      'No production native modules installed were found'
    );
  });

  it('should return true and log errors when prod transient native modules are found', async () => {
    // Use a fixture with native modules
    const withTransientNativeModulesDir = path.join(fixturesDir, 'with_transient_native_modules');
    const withTransientNativeModulesPkgJsonPath = path.join(
      withTransientNativeModulesDir,
      'package.json'
    );
    jest.spyOn(process, 'cwd').mockReturnValue(withTransientNativeModulesDir);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    jest.replaceProperty(require('@kbn/repo-info'), 'REPO_ROOT', withTransientNativeModulesDir);

    const withTransientNativeModulesPkgJson = JSON.parse(
      fs.readFileSync(withTransientNativeModulesPkgJsonPath, 'utf8')
    );

    jest.replaceProperty(
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@kbn/repo-info'),
      'kibanaPackageJson',
      withTransientNativeModulesPkgJson
    );

    const result = await checkProdNativeModules(mockLog);

    expect(result).toBe(true);
    expect(mockLog.error).toHaveBeenCalledWith(
      expect.stringContaining('Production native module detected:')
    );
    expect(mockLog.error).toHaveBeenCalledWith(
      'Production native modules were detected and logged above'
    );
  });
});
