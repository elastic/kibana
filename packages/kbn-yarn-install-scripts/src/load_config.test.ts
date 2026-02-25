/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';

import { loadConfig } from './load_config';

jest.mock('fs');

const mockFs = Fs as jest.Mocked<typeof Fs>;

describe('loadConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load and parse a valid config file', () => {
    const mockConfig = {
      packages: [
        { path: '@elastic/eui', lifecycle: 'postinstall', required: true, reason: 'Required' },
        { path: '@elastic/charts', lifecycle: 'install', required: false, reason: 'Optional' },
      ],
    };
    mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
    const result = loadConfig();

    expect(mockFs.readFileSync).toHaveBeenCalledWith(
      expect.stringContaining('config.json'),
      'utf8'
    );
    expect(result).toEqual(mockConfig);
  });

  it('should handle an empty packages array', () => {
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ packages: [] }));
    expect(loadConfig().packages).toHaveLength(0);
  });

  it('should throw when config file does not exist', () => {
    mockFs.readFileSync.mockImplementation(() => {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    });
    expect(() => loadConfig()).toThrow('Failed to load configuration file');
  });

  it('should throw when config file contains invalid JSON', () => {
    mockFs.readFileSync.mockReturnValue('{ invalid json }');
    expect(() => loadConfig()).toThrow();
  });
});
