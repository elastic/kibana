/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import { groupByPackage } from './group_by_package';

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');

describe('groupByPackage', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should group dependencies by their package directories', () => {
    // Mock path.dirname to simulate directory structure
    const mockDirname = jest.fn().mockImplementation((filePath) => {
      if (filePath === 'src/package1/file1.js' || filePath === 'src/package1/sub/file2.js') {
        // First call for the file's immediate directory
        if (filePath === 'src/package1/file1.js') return 'src/package1';
        if (filePath === 'src/package1/sub/file2.js') return 'src/package1/sub';
      } else if (filePath === 'src/package1/sub') {
        // When checking parent directory of 'src/package1/sub'
        return 'src/package1';
      } else if (filePath === 'src/package2/file2.js') {
        return 'src/package2';
      }
      // Default implementation
      return filePath;
    });

    // Mock path.join to handle path concatenation
    const mockJoin = jest
      .fn()
      .mockImplementation((...args) => args.join('/').replace(/\/\//g, '/'));

    // Mock path.parse to handle root directory detection
    const mockParse = jest.fn().mockReturnValue({ root: '/' });

    // Mock fs.existsSync to simulate kibana.jsonc files
    const mockExistsSync = jest.fn().mockImplementation((filePath) => {
      if (filePath === 'src/package1/kibana.jsonc') return true;
      if (filePath === 'src/package2/kibana.jsonc') return true;
      // No kibana.jsonc in 'src/package1/sub'
      if (filePath === 'src/package1/sub/kibana.jsonc') return false;
      return false;
    });

    // Apply mocks
    (path.dirname as jest.Mock).mockImplementation(mockDirname);
    (path.join as jest.Mock).mockImplementation(mockJoin);
    (path.parse as jest.Mock).mockImplementation(mockParse);
    (fs.existsSync as jest.Mock).mockImplementation(mockExistsSync);

    const dependencies = [
      { from: 'src/package1/file1.js', to: 'node_modules/module1' },
      { from: 'src/package1/sub/file2.js', to: 'node_modules/module2' },
      { from: 'src/package2/file2.js', to: 'node_modules/module3' },
    ];

    const result = groupByPackage(dependencies);

    expect(result).toEqual({
      'src/package1': ['module1', 'module2'],
      'src/package2': ['module3'],
    });
  });

  it('should handle a dependency with no package directory', () => {
    // Mock directoryname to return consistent paths
    const mockDirname = jest.fn().mockImplementation((filePath) => {
      if (filePath === 'src/no-package/file.js') return 'src/no-package';
      return filePath;
    });

    // Mock path.join for consistent behavior
    const mockJoin = jest
      .fn()
      .mockImplementation((...args) => args.join('/').replace(/\/\//g, '/'));

    // Mock path.parse to handle root directory detection
    const mockParse = jest.fn().mockReturnValue({ root: '/' });

    // Mock fs.existsSync to return false (no kibana.jsonc exists)
    const mockExistsSync = jest.fn().mockReturnValue(false);

    // Apply mocks
    (path.dirname as jest.Mock).mockImplementation(mockDirname);
    (path.join as jest.Mock).mockImplementation(mockJoin);
    (path.parse as jest.Mock).mockImplementation(mockParse);
    (fs.existsSync as jest.Mock).mockImplementation(mockExistsSync);

    const dependencies = [{ from: 'src/no-package/file.js', to: 'node_modules/module1' }];

    const result = groupByPackage(dependencies);

    // Should fall back to the file's directory when no package found
    expect(result).toEqual({
      'src/no-package': ['module1'],
    });
  });

  it('should group multiple dependencies from files in the same package', () => {
    // Mock path.dirname for consistent behavior
    const mockDirname = jest.fn().mockImplementation((filePath) => {
      if (filePath.startsWith('src/package1/')) return 'src/package1';
      return filePath;
    });

    // Mock path.join for path concatenation
    const mockJoin = jest
      .fn()
      .mockImplementation((...args) => args.join('/').replace(/\/\//g, '/'));

    // Mock path.parse for root directory
    const mockParse = jest.fn().mockReturnValue({ root: '/' });

    // Mock fs.existsSync to simulate kibana.jsonc file
    const mockExistsSync = jest.fn().mockImplementation((filePath) => {
      return filePath === 'src/package1/kibana.jsonc';
    });

    // Apply mocks
    (path.dirname as jest.Mock).mockImplementation(mockDirname);
    (path.join as jest.Mock).mockImplementation(mockJoin);
    (path.parse as jest.Mock).mockImplementation(mockParse);
    (fs.existsSync as jest.Mock).mockImplementation(mockExistsSync);

    const dependencies = [
      { from: 'src/package1/file1.js', to: 'node_modules/module1' },
      { from: 'src/package1/file2.js', to: 'node_modules/module2' },
      { from: 'src/package1/nested/file3.js', to: 'node_modules/module3' },
    ];

    const result = groupByPackage(dependencies);

    expect(result).toEqual({
      'src/package1': ['module1', 'module2', 'module3'],
    });
  });

  it('should remove "node_modules/" prefix from dependencies', () => {
    // Mock path.dirname for consistent behavior
    const mockDirname = jest.fn().mockReturnValue('src/package1');

    // Mock path.join for path concatenation
    const mockJoin = jest
      .fn()
      .mockImplementation((...args) => args.join('/').replace(/\/\//g, '/'));

    // Mock path.parse for root directory
    const mockParse = jest.fn().mockReturnValue({ root: '/' });

    // Mock fs.existsSync to simulate kibana.jsonc file
    const mockExistsSync = jest.fn().mockReturnValue(true);

    // Apply mocks
    (path.dirname as jest.Mock).mockImplementation(mockDirname);
    (path.join as jest.Mock).mockImplementation(mockJoin);
    (path.parse as jest.Mock).mockImplementation(mockParse);
    (fs.existsSync as jest.Mock).mockImplementation(mockExistsSync);

    const dependencies = [
      { from: 'src/package1/file1.js', to: 'node_modules/module1' },
      { from: 'src/package1/file1.js', to: 'node_modules/module2' },
    ];

    const result = groupByPackage(dependencies);

    expect(result).toEqual({
      'src/package1': ['module1', 'module2'],
    });
  });

  it('should return an empty object if there are no dependencies', () => {
    const result = groupByPackage([]);

    expect(result).toEqual({});
  });

  it('should handle multiple packages in nested directory structure', () => {
    // Mock path.dirname to simulate directory structure
    const mockDirname = jest.fn().mockImplementation((filePath) => {
      if (filePath === 'src/parent/package1/file1.js') return 'src/parent/package1';
      if (filePath === 'src/parent/package2/file2.js') return 'src/parent/package2';
      return path.dirname(filePath);
    });

    // Mock path.join to handle path concatenation
    const mockJoin = jest
      .fn()
      .mockImplementation((...args) => args.join('/').replace(/\/\//g, '/'));

    // Mock path.parse to handle root directory detection
    const mockParse = jest.fn().mockReturnValue({ root: '/' });

    // Mock fs.existsSync to simulate kibana.jsonc files
    const mockExistsSync = jest.fn().mockImplementation((filePath) => {
      if (filePath === 'src/parent/package1/kibana.jsonc') return true;
      if (filePath === 'src/parent/package2/kibana.jsonc') return true;
      return false;
    });

    // Apply mocks
    (path.dirname as jest.Mock).mockImplementation(mockDirname);
    (path.join as jest.Mock).mockImplementation(mockJoin);
    (path.parse as jest.Mock).mockImplementation(mockParse);
    (fs.existsSync as jest.Mock).mockImplementation(mockExistsSync);

    const dependencies = [
      { from: 'src/parent/package1/file1.js', to: 'node_modules/module1' },
      { from: 'src/parent/package2/file2.js', to: 'node_modules/module2' },
    ];

    const result = groupByPackage(dependencies);

    expect(result).toEqual({
      'src/parent/package1': ['module1'],
      'src/parent/package2': ['module2'],
    });
  });
});
