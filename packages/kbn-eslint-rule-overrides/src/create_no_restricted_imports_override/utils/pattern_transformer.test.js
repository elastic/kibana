/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { transformSinglePattern } = require('./pattern_transformer');

describe('pattern-transformer', () => {
  const rootDir = '/project';
  const targetDir = '/project/src/components';

  describe('when transforming literal patterns', () => {
    it('should transform literal file paths within target directory', () => {
      const result = transformSinglePattern('src/components/Button.js', rootDir, targetDir);
      expect(result).toBe('Button.js');
    });

    it('should return null for literal paths outside target directory', () => {
      const result = transformSinglePattern('packages/core/index.js', rootDir, targetDir);
      expect(result).toBe(null);
    });

    it('should handle exact directory match', () => {
      const result = transformSinglePattern('src/components', rootDir, targetDir);
      expect(result).toBe('.');
    });

    it('should handle nested paths', () => {
      const result = transformSinglePattern('src/components/forms/Input.js', rootDir, targetDir);
      expect(result).toBe('forms/Input.js');
    });
  });

  describe('when transforming simple glob patterns', () => {
    it('should handle simple wildcard patterns', () => {
      const result = transformSinglePattern('src/components/*.js', rootDir, targetDir);
      expect(result).toBe('*.js');
    });

    it('should handle question mark patterns', () => {
      const result = transformSinglePattern('src/components/?.js', rootDir, targetDir);
      expect(result).toBe('?.js');
    });

    it('should handle character class patterns', () => {
      const result = transformSinglePattern('src/components/[A-Z]*.js', rootDir, targetDir);
      expect(result).toBe('[A-Z]*.js');
    });

    it('should handle multiple wildcards', () => {
      const result = transformSinglePattern('src/components/*/*.js', rootDir, targetDir);
      expect(result).toBe('*/*.js');
    });
  });

  describe('when transforming globstar patterns', () => {
    it('should handle basic globstar patterns', () => {
      const result = transformSinglePattern('src/**/*.js', rootDir, targetDir);
      expect(result).toBe('**/*.js');
    });

    it('should handle globstar with specific subdirectory', () => {
      const result = transformSinglePattern('src/**/test/**/*.js', rootDir, targetDir);
      expect(result).toBe('**/test/**/*.js');
    });

    it('should handle multiple globstar segments', () => {
      const result = transformSinglePattern('src/**/components/**/*.js', rootDir, targetDir);
      expect(result).toBe('**/*.js');
    });

    it('should handle globstar at end', () => {
      const result = transformSinglePattern('src/components/**', rootDir, targetDir);
      expect(result).toBe('**');
    });

    it('should handle single globstar', () => {
      const result = transformSinglePattern('**', rootDir, targetDir);
      expect(result).toBe('**/*');
    });
  });

  describe('when transforming extglob patterns', () => {
    it('should handle negated extglob patterns', () => {
      const result = transformSinglePattern('src/components/!(test)/**/*.js', rootDir, targetDir);
      expect(result).toBe('!(test)/**/*.js');
    });

    it('should handle optional extglob patterns', () => {
      const result = transformSinglePattern('src/components/?(test)/*.js', rootDir, targetDir);
      expect(result).toBe('?(test)/*.js');
    });

    it('should handle zero-or-more extglob patterns', () => {
      const result = transformSinglePattern('src/components/*(test)/*.js', rootDir, targetDir);
      expect(result).toBe('*(test)/*.js');
    });

    it('should handle one-or-more extglob patterns', () => {
      const result = transformSinglePattern('src/components/+(test|spec)/*.js', rootDir, targetDir);
      expect(result).toBe('+(test|spec)/*.js');
    });

    it('should handle exactly-one extglob patterns', () => {
      const result = transformSinglePattern('src/components/@(test|spec)/*.js', rootDir, targetDir);
      expect(result).toBe('@(test|spec)/*.js');
    });

    it('should handle complex extglob with file extensions', () => {
      const result = transformSinglePattern('src/components/**/!(*.js)', rootDir, targetDir);
      expect(result).toBe('**/!(*.js)');
    });
  });

  describe('when pattern does not apply to target directory', () => {
    it('should return null for non-matching patterns', () => {
      const result = transformSinglePattern('packages/**/*.js', rootDir, targetDir);
      expect(result).toBe(null);
    });

    it('should return null for specific non-matching paths', () => {
      const result = transformSinglePattern('src/utils/**/*.js', rootDir, targetDir);
      expect(result).toBe(null);
    });

    it('should return null for root-level patterns', () => {
      const result = transformSinglePattern('*.js', rootDir, targetDir);
      expect(result).toBe(null);
    });

    it('should return null for completely different directory trees', () => {
      const result = transformSinglePattern('docs/**/*.md', rootDir, targetDir);
      expect(result).toBe(null);
    });
  });

  describe('when handling edge cases', () => {
    it('should handle patterns with double dots', () => {
      const result = transformSinglePattern('src/components/*..js', rootDir, targetDir);
      expect(result).toBe('*..js');
    });

    it('should handle patterns with special characters', () => {
      const result = transformSinglePattern('src/components/*-test*.js', rootDir, targetDir);
      expect(result).toBe('*-test*.js');
    });

    it('should handle patterns with spaces (escaped)', () => {
      const result = transformSinglePattern('src/components/my\\ file.js', rootDir, targetDir);
      expect(result).toBe('my\\ file.js');
    });

    it('should handle patterns with Unicode characters', () => {
      const result = transformSinglePattern('src/components/ñoño*.js', rootDir, targetDir);
      expect(result).toBe('ñoño*.js');
    });
  });

  describe('when handling different target directories', () => {
    it('should handle deeply nested target directory', () => {
      const deepTarget = '/project/src/components/forms/inputs';
      const result = transformSinglePattern('src/components/forms/**/*.js', rootDir, deepTarget);
      expect(result).toBe('**/*.js');
    });

    it('should handle target directory at different level', () => {
      const utilsTarget = '/project/src/utils';
      const result = transformSinglePattern('src/**/*.js', rootDir, utilsTarget);
      expect(result).toBe('**/*.js');
    });

    it('should handle target directory equal to pattern directory', () => {
      const srcTarget = '/project/src';
      const result = transformSinglePattern('src/**/*.js', rootDir, srcTarget);
      expect(result).toBe('**/*.js');
    });
  });

  describe('when handling cross-platform paths', () => {
    it('should handle Windows-style paths when on Windows', () => {
      if (process.platform === 'win32') {
        const winRootDir = 'C:\\project';
        const winTargetDir = 'C:\\project\\src\\components';
        const result = transformSinglePattern('src\\components\\*.js', winRootDir, winTargetDir);
        expect(result).toBe('*.js');
      }
    });
  });
});
