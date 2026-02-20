/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/mock/repo',
}));

import { readFileSync } from 'fs';
import {
  loadShardConfig,
  resetShardConfigCache,
  parseShardAnnotation,
  annotateConfigWithShard,
  expandShardedConfigs,
  getShardCountForConfig,
} from './shard_config';

const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;

describe('shard_config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetShardConfigCache();
  });

  describe('loadShardConfig', () => {
    it('should read and parse the JSON file', () => {
      const shardData = { 'path/jest.config.js': 3 };
      mockReadFileSync.mockReturnValue(JSON.stringify(shardData));

      const result = loadShardConfig();

      expect(result).toEqual(shardData);
      expect(mockReadFileSync).toHaveBeenCalledWith(
        '/mock/repo/.buildkite/sharded_jest_configs.json',
        'utf8'
      );
    });

    it('should cache the result on subsequent calls', () => {
      const shardData = { 'path/jest.config.js': 2 };
      mockReadFileSync.mockReturnValue(JSON.stringify(shardData));

      loadShardConfig();
      loadShardConfig();

      expect(mockReadFileSync).toHaveBeenCalledTimes(1);
    });

    it('should return empty map if file does not exist', () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      const result = loadShardConfig();

      expect(result).toEqual({});
    });

    it('should return empty map if JSON is invalid', () => {
      mockReadFileSync.mockReturnValue('not valid json');

      const result = loadShardConfig();

      expect(result).toEqual({});
    });
  });

  describe('parseShardAnnotation', () => {
    it('should parse a shard-annotated config name', () => {
      expect(parseShardAnnotation('path/jest.config.js||shard=1/2')).toEqual({
        config: 'path/jest.config.js',
        shard: '1/2',
      });
    });

    it('should parse shard annotation with higher counts', () => {
      expect(parseShardAnnotation('path/jest.config.js||shard=3/4')).toEqual({
        config: 'path/jest.config.js',
        shard: '3/4',
      });
    });

    it('should return config without shard for plain names', () => {
      expect(parseShardAnnotation('path/jest.config.js')).toEqual({
        config: 'path/jest.config.js',
      });
    });

    it('should handle empty string', () => {
      expect(parseShardAnnotation('')).toEqual({
        config: '',
      });
    });
  });

  describe('annotateConfigWithShard', () => {
    it('should produce annotated string', () => {
      expect(annotateConfigWithShard('path/jest.config.js', '1/2')).toBe(
        'path/jest.config.js||shard=1/2'
      );
    });
  });

  describe('expandShardedConfigs', () => {
    const shardMap = {
      'a/jest.config.js': 2,
      'b/jest.integration.config.js': 3,
    };

    it('should expand configs that are in the shard map', () => {
      const configs = ['a/jest.config.js'];
      const result = expandShardedConfigs(configs, shardMap);
      expect(result).toEqual(['a/jest.config.js||shard=1/2', 'a/jest.config.js||shard=2/2']);
    });

    it('should expand to 3 shards', () => {
      const configs = ['b/jest.integration.config.js'];
      const result = expandShardedConfigs(configs, shardMap);
      expect(result).toEqual([
        'b/jest.integration.config.js||shard=1/3',
        'b/jest.integration.config.js||shard=2/3',
        'b/jest.integration.config.js||shard=3/3',
      ]);
    });

    it('should pass through configs not in the shard map', () => {
      const configs = ['c/jest.config.js'];
      const result = expandShardedConfigs(configs, shardMap);
      expect(result).toEqual(['c/jest.config.js']);
    });

    it('should pass through already-annotated configs', () => {
      const configs = ['a/jest.config.js||shard=1/2'];
      const result = expandShardedConfigs(configs, shardMap);
      expect(result).toEqual(['a/jest.config.js||shard=1/2']);
    });

    it('should handle mixed configs', () => {
      const configs = ['a/jest.config.js', 'c/jest.config.js', 'b/jest.integration.config.js'];
      const result = expandShardedConfigs(configs, shardMap);
      expect(result).toEqual([
        'a/jest.config.js||shard=1/2',
        'a/jest.config.js||shard=2/2',
        'c/jest.config.js',
        'b/jest.integration.config.js||shard=1/3',
        'b/jest.integration.config.js||shard=2/3',
        'b/jest.integration.config.js||shard=3/3',
      ]);
    });

    it('should not expand configs with shard count of 1', () => {
      const map = { 'a/jest.config.js': 1 };
      const configs = ['a/jest.config.js'];
      const result = expandShardedConfigs(configs, map);
      expect(result).toEqual(['a/jest.config.js']);
    });

    it('should handle empty configs array', () => {
      const result = expandShardedConfigs([], shardMap);
      expect(result).toEqual([]);
    });
  });

  describe('getShardCountForConfig', () => {
    it('should return shard count for an absolute path', () => {
      const shardData = { 'path/jest.config.js': 4 };
      mockReadFileSync.mockReturnValue(JSON.stringify(shardData));

      const result = getShardCountForConfig('/mock/repo/path/jest.config.js');
      expect(result).toBe(4);
    });

    it('should return shard count for a relative path', () => {
      const shardData = { 'path/jest.config.js': 4 };
      mockReadFileSync.mockReturnValue(JSON.stringify(shardData));

      const result = getShardCountForConfig('path/jest.config.js');
      expect(result).toBe(4);
    });

    it('should return undefined for configs not in the map', () => {
      const shardData = { 'path/jest.config.js': 4 };
      mockReadFileSync.mockReturnValue(JSON.stringify(shardData));

      const result = getShardCountForConfig('/mock/repo/other/jest.config.js');
      expect(result).toBeUndefined();
    });
  });
});
