/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const path = require('path');

const { transformLiteralPath } = require('./transform_literal_path');

describe('transformLiteralPath', () => {
  const rootDir = '/project';
  const targetDir = '/project/src/components';

  describe('WHEN transforming literal paths within target directory', () => {
    it('SHOULD transform file in target directory to relative path', () => {
      const result = transformLiteralPath('src/components/Button.js', rootDir, targetDir);
      expect(result).toBe('Button.js');
    });

    describe('AND WHEN the path is in a subdirectory of target', () => {
      it('SHOULD transform to relative path from target directory', () => {
        const result = transformLiteralPath('src/components/forms/Input.js', rootDir, targetDir);
        expect(result).toBe('forms/Input.js');
      });

      it('SHOULD handle deeply nested subdirectories', () => {
        const result = transformLiteralPath(
          'src/components/ui/buttons/Button.js',
          rootDir,
          targetDir
        );
        expect(result).toBe('ui/buttons/Button.js');
      });
    });

    describe('AND WHEN the path exactly matches the target directory', () => {
      it('SHOULD return dot for current directory', () => {
        const result = transformLiteralPath('src/components', rootDir, targetDir);
        expect(result).toBe('.');
      });
    });
  });

  describe('WHEN transforming literal paths outside target directory', () => {
    describe('AND WHEN the path is in a sibling directory', () => {
      it('SHOULD return null', () => {
        const result = transformLiteralPath('src/utils/helpers.js', rootDir, targetDir);
        expect(result).toBe(null);
      });
    });

    describe('AND WHEN the path is in a parent directory', () => {
      it('SHOULD return null', () => {
        const result = transformLiteralPath('src/index.js', rootDir, targetDir);
        expect(result).toBe(null);
      });
    });

    describe('AND WHEN the path is in a completely different location', () => {
      it('SHOULD return null', () => {
        const result = transformLiteralPath('packages/core/index.js', rootDir, targetDir);
        expect(result).toBe(null);
      });
    });

    describe('AND WHEN the path is at root level', () => {
      it('SHOULD return null', () => {
        const result = transformLiteralPath('package.json', rootDir, targetDir);
        expect(result).toBe(null);
      });
    });
  });

  describe('WHEN handling edge cases', () => {
    describe('AND WHEN the literal pattern is an absolute path', () => {
      it('SHOULD transform absolute path to relative path', () => {
        const absolutePattern = path.resolve(rootDir, 'src/components/Button.js');
        const result = transformLiteralPath(absolutePattern, rootDir, targetDir);
        expect(result).toBe('Button.js');
      });
    });

    describe('AND WHEN the target directory has a trailing slash', () => {
      it('SHOULD handle the transformation correctly', () => {
        const result = transformLiteralPath('src/components/Button.js', rootDir, targetDir + '/');
        expect(result).toBe('Button.js');
      });
    });

    describe('AND WHEN dealing with Windows-style paths', () => {
      it('SHOULD handle Windows path separators correctly', () => {
        if (process.platform === 'win32') {
          const winRootDir = 'C:\\project';
          const winTargetDir = 'C:\\project\\src\\components';
          const result = transformLiteralPath(
            'src\\components\\Button.js',
            winRootDir,
            winTargetDir
          );
          expect(result).toBe('Button.js');
        }
      });
    });
  });
});
