/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { transformLiteralPath } = require('./literal_path_transformer');
const path = require('path');

describe('literal-path-transformer', () => {
  const rootDir = '/project';
  const targetDir = '/project/src/components';

  describe('when transforming literal paths within target directory', () => {
    it('should transform file in target directory', () => {
      const result = transformLiteralPath('src/components/Button.js', rootDir, targetDir);
      expect(result).toBe('Button.js');
    });

    it('should transform file in subdirectory of target', () => {
      const result = transformLiteralPath('src/components/forms/Input.js', rootDir, targetDir);
      expect(result).toBe('forms/Input.js');
    });

    it('should return dot for exact target directory match', () => {
      const result = transformLiteralPath('src/components', rootDir, targetDir);
      expect(result).toBe('.');
    });

    it('should handle nested subdirectories', () => {
      const result = transformLiteralPath(
        'src/components/ui/buttons/Button.js',
        rootDir,
        targetDir
      );
      expect(result).toBe('ui/buttons/Button.js');
    });
  });

  describe('when transforming literal paths outside target directory', () => {
    it('should return null for sibling directory', () => {
      const result = transformLiteralPath('src/utils/helpers.js', rootDir, targetDir);
      expect(result).toBe(null);
    });

    it('should return null for parent directory file', () => {
      const result = transformLiteralPath('src/index.js', rootDir, targetDir);
      expect(result).toBe(null);
    });

    it('should return null for completely different path', () => {
      const result = transformLiteralPath('packages/core/index.js', rootDir, targetDir);
      expect(result).toBe(null);
    });

    it('should return null for root level file', () => {
      const result = transformLiteralPath('package.json', rootDir, targetDir);
      expect(result).toBe(null);
    });
  });

  describe('when handling edge cases', () => {
    it('should handle absolute paths in literal pattern', () => {
      const absolutePattern = path.resolve(rootDir, 'src/components/Button.js');
      const result = transformLiteralPath(absolutePattern, rootDir, targetDir);
      expect(result).toBe('Button.js');
    });

    it('should handle target directory with trailing slash', () => {
      const result = transformLiteralPath('src/components/Button.js', rootDir, targetDir + '/');
      expect(result).toBe('Button.js');
    });

    it('should handle Windows-style paths', () => {
      if (process.platform === 'win32') {
        const winRootDir = 'C:\\project';
        const winTargetDir = 'C:\\project\\src\\components';
        const result = transformLiteralPath('src\\components\\Button.js', winRootDir, winTargetDir);
        expect(result).toBe('Button.js');
      }
    });
  });
});
