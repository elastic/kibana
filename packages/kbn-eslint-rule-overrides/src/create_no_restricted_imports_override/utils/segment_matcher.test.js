/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const {
  removeConsumedSegments,
  matchesPatternPart,
  matchGlobstarPattern,
} = require('./segment_matcher');

describe('segment-matcher', () => {
  describe('when removing consumed segments', () => {
    it('should remove exact matching segments', () => {
      const result = removeConsumedSegments('src/components/*.js', ['src', 'components']);
      expect(result).toBe('*.js');
    });

    it('should handle wildcard segments', () => {
      const result = removeConsumedSegments('src/*/index.js', ['src', 'components']);
      expect(result).toBe('index.js');
    });

    it('should handle globstar patterns and preserve ** semantics', () => {
      const result = removeConsumedSegments('src/**/*.js', ['src', 'components']);
      expect(result).toBe('**/*.js');
    });

    it('should handle globstar with following segments and preserve ** semantics', () => {
      const result = removeConsumedSegments('src/**/test/**/*.js', ['src', 'components']);
      expect(result).toBe('**/test/**/*.js');
    });

    it('should return null when pattern does not match', () => {
      const result = removeConsumedSegments('packages/**/*.js', ['src', 'components']);
      expect(result).toBe(null);
    });

    it('should handle empty path segments', () => {
      const result = removeConsumedSegments('src/**/*.js', []);
      expect(result).toBe('src/**/*.js');
    });

    it('should return default pattern when all segments consumed', () => {
      const result = removeConsumedSegments('src/components', ['src', 'components']);
      expect(result).toBe('**/*');
    });

    it('should handle multiple globstars', () => {
      const result = removeConsumedSegments('src/**/lib/**/index.js', ['src', 'components']);
      expect(result).toBe('**/lib/**/index.js');
    });

    it('should handle globstar at different positions', () => {
      const result = removeConsumedSegments('**/src/components/*.js', ['foo', 'src', 'components']);
      expect(result).toBe('*.js');
    });

    it('should handle partial path consumption with globstar', () => {
      const result = removeConsumedSegments('src/**/test/**/*.js', ['src']);
      expect(result).toBe('**/test/**/*.js');
    });
  });

  describe('when matching pattern parts', () => {
    it('should match exact literals', () => {
      expect(matchesPatternPart('components', 'components')).toBe(true);
      expect(matchesPatternPart('components', 'utils')).toBe(false);
    });

    it('should match single wildcard', () => {
      expect(matchesPatternPart('components', '*')).toBe(true);
      expect(matchesPatternPart('utils', '*')).toBe(true);
    });

    it('should match wildcard patterns', () => {
      expect(matchesPatternPart('Button.js', '*.js')).toBe(true);
      expect(matchesPatternPart('Button.ts', '*.js')).toBe(false);
    });

    it('should match question mark patterns', () => {
      expect(matchesPatternPart('a', '?')).toBe(true);
      expect(matchesPatternPart('ab', '?')).toBe(false);
    });

    it('should match character classes', () => {
      expect(matchesPatternPart('a', '[abc]')).toBe(true);
      expect(matchesPatternPart('d', '[abc]')).toBe(false);
    });

    it('should handle complex wildcard patterns', () => {
      expect(matchesPatternPart('Button.test.js', '*.test.js')).toBe(true);
      expect(matchesPatternPart('Button.js', '*.test.js')).toBe(false);
    });
  });

  describe('when matching positive extglob patterns', () => {
    it('should match one-or-more extglob patterns', () => {
      expect(matchesPatternPart('test', '+(test|spec)')).toBe(true);
      expect(matchesPatternPart('spec', '+(test|spec)')).toBe(true);
      expect(matchesPatternPart('foo', '+(test|spec)')).toBe(false);
    });

    it('should match zero-or-more extglob patterns', () => {
      expect(matchesPatternPart('test', '*(test)')).toBe(true);
      expect(matchesPatternPart('', '*(test)')).toBe(true);
      expect(matchesPatternPart('foo', '*(test)')).toBe(false);
    });

    it('should match optional extglob patterns', () => {
      expect(matchesPatternPart('test', '?(test)')).toBe(true);
      expect(matchesPatternPart('', '?(test)')).toBe(true);
      expect(matchesPatternPart('foo', '?(test)')).toBe(false);
    });

    it('should match exactly-one extglob patterns', () => {
      expect(matchesPatternPart('test', '@(test|spec)')).toBe(true);
      expect(matchesPatternPart('spec', '@(test|spec)')).toBe(true);
      expect(matchesPatternPart('foo', '@(test|spec)')).toBe(false);
    });
  });

  describe('when matching negated extglob patterns', () => {
    it('should handle simple literal negation', () => {
      expect(matchesPatternPart('test', '!(foo)')).toBe(true);
      expect(matchesPatternPart('foo', '!(foo)')).toBe(false);
    });

    it('should handle directory name negation', () => {
      expect(matchesPatternPart('shared', '!(foobar)')).toBe(true);
      expect(matchesPatternPart('foobar', '!(foobar)')).toBe(false);
      expect(matchesPatternPart('components', '!(foobar)')).toBe(true);
    });

    it('should handle wildcard negation', () => {
      expect(matchesPatternPart('file.test', '!(*.test)')).toBe(false);
      expect(matchesPatternPart('file.js', '!(*.test)')).toBe(true);
      expect(matchesPatternPart('Component.test', '!(*.test)')).toBe(false);
      expect(matchesPatternPart('Component.spec', '!(*.test)')).toBe(true);
    });

    it('should handle alternation negation', () => {
      expect(matchesPatternPart('foo', '!(foo|bar)')).toBe(false);
      expect(matchesPatternPart('bar', '!(foo|bar)')).toBe(false);
      expect(matchesPatternPart('baz', '!(foo|bar)')).toBe(true);
      expect(matchesPatternPart('test', '!(foo|bar)')).toBe(true);
    });

    it('should handle complex wildcard negation', () => {
      expect(matchesPatternPart('Component.test.js', '!(*.test.*)')).toBe(false);
      expect(matchesPatternPart('Component.spec.ts', '!(*.test.*)')).toBe(true);
      expect(matchesPatternPart('Component.js', '!(*.test.*)')).toBe(true);
      expect(matchesPatternPart('Button.test.tsx', '!(*.test.*)')).toBe(false);
    });

    it('should handle file extension negation', () => {
      expect(matchesPatternPart('file.test.js', '!(*.test.js)')).toBe(false);
      expect(matchesPatternPart('file.js', '!(*.test.js)')).toBe(true);
      expect(matchesPatternPart('file.spec.js', '!(*.test.js)')).toBe(true);
    });

    it('should handle negation with multiple wildcards', () => {
      expect(matchesPatternPart('a.test.b', '!(*.test.*)')).toBe(false);
      expect(matchesPatternPart('a.spec.b', '!(*.test.*)')).toBe(true);
      expect(matchesPatternPart('test.file', '!(*.test.*)')).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(matchesPatternPart('anything', '!()')).toBe(true);
      expect(matchesPatternPart('', '!(foo)')).toBe(true);
      expect(matchesPatternPart('foo', '!(foo)')).toBe(false);
      expect(matchesPatternPart('', '!()')).toBe(false);
    });

    it('should handle nested extglob patterns', () => {
      expect(matchesPatternPart('foo.test.js', '!(*(foo).test.*)')).toBe(false);
      expect(matchesPatternPart('bar.test.js', '!(*(foo).test.*)')).toBe(true);
      expect(matchesPatternPart('foo.spec.js', '!(*(foo).test.*)')).toBe(true);
    });
  });

  describe('when handling real-world ESLint patterns', () => {
    it('should handle complex exclude patterns for test files', () => {
      // Pattern: **/!(*.test).{js,ts} - exclude files containing .test
      expect(matchesPatternPart('Component.js', '!(*.test)')).toBe(true);
      expect(matchesPatternPart('Component.test', '!(*.test)')).toBe(false);
      expect(matchesPatternPart('Button.spec', '!(*.test)')).toBe(true);
      expect(matchesPatternPart('utils.test', '!(*.test)')).toBe(false);
    });

    it('should handle directory exclusion patterns', () => {
      // Pattern: x-pack/platform/plugins/shared/!(foobar)/...
      expect(matchesPatternPart('shared', '!(foobar)')).toBe(true);
      expect(matchesPatternPart('foobar', '!(foobar)')).toBe(false);
      expect(matchesPatternPart('legacy', '!(foobar)')).toBe(true);
    });

    it('should handle multiple exclusion patterns', () => {
      // Pattern: !(node_modules|dist|build)
      expect(matchesPatternPart('src', '!(node_modules|dist|build)')).toBe(true);
      expect(matchesPatternPart('node_modules', '!(node_modules|dist|build)')).toBe(false);
      expect(matchesPatternPart('dist', '!(node_modules|dist|build)')).toBe(false);
      expect(matchesPatternPart('build', '!(node_modules|dist|build)')).toBe(false);
      expect(matchesPatternPart('lib', '!(node_modules|dist|build)')).toBe(true);
    });
  });

  describe('when matching globstar patterns', () => {
    it('should handle single globstar', () => {
      const result = matchGlobstarPattern(['**'], ['a', 'b', 'c']);
      expect(result).toBe('**/*');
    });

    it('should handle globstar with following pattern', () => {
      const result = matchGlobstarPattern(['**', '*.js'], ['test', 'Button.js']);
      expect(result).toBe('**/*.js');
    });

    it('should handle globstar with multiple following segments', () => {
      const result = matchGlobstarPattern(
        ['**', 'test', '*.js'],
        ['components', 'test', 'Button.js']
      );
      expect(result).toBe('**/test/*.js');
    });

    it('should handle empty segments with empty pattern', () => {
      const result = matchGlobstarPattern([], []);
      expect(result).toBe('');
    });

    it('should handle empty segments with pattern', () => {
      const result = matchGlobstarPattern(['test'], []);
      expect(result).toBe('test');
    });

    it('should handle complex nested patterns', () => {
      const result = matchGlobstarPattern(
        ['**', 'test', '**', '*.js'],
        ['src', 'components', 'test', 'unit', 'Button.js']
      );
      expect(result).toBe('**/test/**/*.js');
    });

    it('should handle non-matching patterns', () => {
      const result = matchGlobstarPattern(['**', 'missing'], ['a', 'b', 'c']);
      expect(result).toBe('**/missing');
    });

    it('should handle multiple globstars', () => {
      const result = matchGlobstarPattern(['**', 'lib', '**'], ['src', 'lib', 'utils']);
      expect(result).toBe('**/lib/**');
    });
  });

  describe('when handling error cases', () => {
    it('should handle malformed patterns gracefully', () => {
      expect(matchesPatternPart('test', '!(unclosed')).toBe(false);
      expect(matchesPatternPart('test', '!()')).toBe(true);
      expect(matchesPatternPart('test', '!(')).toBe(false);
    });

    it('should handle empty inputs', () => {
      expect(matchesPatternPart('', '')).toBe(true);
      expect(matchesPatternPart('test', '')).toBe(false);
      expect(matchesPatternPart('', 'test')).toBe(false);
    });

    it('should handle special characters in segments', () => {
      expect(matchesPatternPart('file-name', 'file-name')).toBe(true);
      expect(matchesPatternPart('file_name', 'file_name')).toBe(true);
      expect(matchesPatternPart('file.name', 'file.name')).toBe(true);
    });
  });
});
