/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { removeConsumedSegments, matchesPatternPart } = require('./remove_consumed_segments');

describe('removeConsumedSegments', () => {
  describe('WHEN removing consumed segments', () => {
    describe('AND WHEN pattern has exact matching segments', () => {
      it('SHOULD remove the matching segments and return remainder', () => {
        const result = removeConsumedSegments('src/components/*.js', ['src', 'components']);
        expect(result).toBe('*.js');
      });
    });

    describe('AND WHEN pattern contains wildcard segments', () => {
      it('SHOULD handle wildcard segments correctly', () => {
        const result = removeConsumedSegments('src/*/index.js', ['src', 'components']);
        expect(result).toBe('index.js');
      });
    });

    describe('AND WHEN pattern contains globstar patterns', () => {
      it('SHOULD preserve globstar semantics in simple cases', () => {
        const result = removeConsumedSegments('src/**/*.js', ['src', 'components']);
        expect(result).toBe('**/*.js');
      });

      it('SHOULD preserve globstar semantics with following segments', () => {
        const result = removeConsumedSegments('src/**/test/**/*.js', ['src', 'components']);
        expect(result).toBe('**/test/**/*.js');
      });

      it('SHOULD handle multiple globstars correctly', () => {
        const result = removeConsumedSegments('src/**/lib/**/index.js', ['src', 'components']);
        expect(result).toBe('**/lib/**/index.js');
      });

      it('SHOULD handle globstar at different positions', () => {
        const result = removeConsumedSegments('**/src/components/*.js', [
          'foo',
          'src',
          'components',
        ]);
        expect(result).toBe('*.js');
      });

      it('SHOULD handle partial path consumption with globstar', () => {
        const result = removeConsumedSegments('src/**/test/**/*.js', ['src']);
        expect(result).toBe('**/test/**/*.js');
      });
    });

    describe('AND WHEN pattern does not match consumed segments', () => {
      it('SHOULD return null', () => {
        const result = removeConsumedSegments('packages/**/*.js', ['src', 'components']);
        expect(result).toBe(null);
      });
    });

    describe('AND WHEN path segments array is empty', () => {
      it('SHOULD return the original pattern unchanged', () => {
        const result = removeConsumedSegments('src/**/*.js', []);
        expect(result).toBe('src/**/*.js');
      });
    });

    describe('AND WHEN all segments are consumed', () => {
      it('SHOULD return default wildcard pattern', () => {
        const result = removeConsumedSegments('src/components', ['src', 'components']);
        expect(result).toBe('**/*');
      });
    });
  });
});

describe('matchesPatternPart', () => {
  describe('WHEN matching pattern parts', () => {
    describe('AND WHEN using exact literals', () => {
      it('SHOULD match identical strings', () => {
        expect(matchesPatternPart('components', 'components')).toBe(true);
      });

      it('SHOULD not match different strings', () => {
        expect(matchesPatternPart('components', 'utils')).toBe(false);
      });
    });

    describe('AND WHEN using single wildcard patterns', () => {
      it('SHOULD match any string with asterisk wildcard', () => {
        expect(matchesPatternPart('components', '*')).toBe(true);
        expect(matchesPatternPart('utils', '*')).toBe(true);
      });

      it('SHOULD match single character with question mark', () => {
        expect(matchesPatternPart('a', '?')).toBe(true);
      });

      it('SHOULD not match multiple characters with question mark', () => {
        expect(matchesPatternPart('ab', '?')).toBe(false);
      });
    });

    describe('AND WHEN using wildcard patterns with extensions', () => {
      it('SHOULD match files with correct extension', () => {
        expect(matchesPatternPart('Button.js', '*.js')).toBe(true);
      });

      it('SHOULD not match files with incorrect extension', () => {
        expect(matchesPatternPart('Button.ts', '*.js')).toBe(false);
      });

      it('SHOULD handle complex wildcard patterns', () => {
        expect(matchesPatternPart('Button.test.js', '*.test.js')).toBe(true);
        expect(matchesPatternPart('Button.js', '*.test.js')).toBe(false);
      });
    });

    describe('AND WHEN using character classes', () => {
      it('SHOULD match characters within the class', () => {
        expect(matchesPatternPart('a', '[abc]')).toBe(true);
      });

      it('SHOULD not match characters outside the class', () => {
        expect(matchesPatternPart('d', '[abc]')).toBe(false);
      });
    });
  });

  describe('WHEN using positive extglob patterns', () => {
    describe('AND WHEN using one-or-more patterns (+)', () => {
      it('SHOULD match any of the specified alternatives', () => {
        expect(matchesPatternPart('test', '+(test|spec)')).toBe(true);
        expect(matchesPatternPart('spec', '+(test|spec)')).toBe(true);
      });

      it('SHOULD not match strings not in alternatives', () => {
        expect(matchesPatternPart('foo', '+(test|spec)')).toBe(false);
      });
    });

    describe('AND WHEN using zero-or-more patterns (*)', () => {
      it('SHOULD match the specified pattern', () => {
        expect(matchesPatternPart('test', '*(test)')).toBe(true);
      });

      it('SHOULD match empty string', () => {
        expect(matchesPatternPart('', '*(test)')).toBe(true);
      });

      it('SHOULD not match non-matching patterns', () => {
        expect(matchesPatternPart('foo', '*(test)')).toBe(false);
      });
    });

    describe('AND WHEN using optional patterns (?)', () => {
      it('SHOULD match the specified pattern', () => {
        expect(matchesPatternPart('test', '?(test)')).toBe(true);
      });

      it('SHOULD match empty string', () => {
        expect(matchesPatternPart('', '?(test)')).toBe(true);
      });

      it('SHOULD not match non-matching patterns', () => {
        expect(matchesPatternPart('foo', '?(test)')).toBe(false);
      });
    });

    describe('AND WHEN using exactly-one patterns (@)', () => {
      it('SHOULD match any of the specified alternatives', () => {
        expect(matchesPatternPart('test', '@(test|spec)')).toBe(true);
        expect(matchesPatternPart('spec', '@(test|spec)')).toBe(true);
      });

      it('SHOULD not match strings not in alternatives', () => {
        expect(matchesPatternPart('foo', '@(test|spec)')).toBe(false);
      });
    });
  });

  describe('WHEN using negated extglob patterns', () => {
    describe('AND WHEN using simple literal negation', () => {
      it('SHOULD match strings that do not match the negated pattern', () => {
        expect(matchesPatternPart('test', '!(foo)')).toBe(true);
      });

      it('SHOULD not match strings that match the negated pattern', () => {
        expect(matchesPatternPart('foo', '!(foo)')).toBe(false);
      });
    });

    describe('AND WHEN using directory name negation', () => {
      it('SHOULD match directory names not in negation', () => {
        expect(matchesPatternPart('shared', '!(foobar)')).toBe(true);
        expect(matchesPatternPart('components', '!(foobar)')).toBe(true);
      });

      it('SHOULD not match negated directory names', () => {
        expect(matchesPatternPart('foobar', '!(foobar)')).toBe(false);
      });
    });

    describe('AND WHEN using wildcard negation', () => {
      it('SHOULD not match files matching the negated wildcard pattern', () => {
        expect(matchesPatternPart('file.test', '!(*.test)')).toBe(false);
        expect(matchesPatternPart('Component.test', '!(*.test)')).toBe(false);
      });

      it('SHOULD match files not matching the negated wildcard pattern', () => {
        expect(matchesPatternPart('file.js', '!(*.test)')).toBe(true);
        expect(matchesPatternPart('Component.spec', '!(*.test)')).toBe(true);
      });
    });

    describe('AND WHEN using alternation negation', () => {
      it('SHOULD not match any string in the negated alternatives', () => {
        expect(matchesPatternPart('foo', '!(foo|bar)')).toBe(false);
        expect(matchesPatternPart('bar', '!(foo|bar)')).toBe(false);
      });

      it('SHOULD match strings not in the negated alternatives', () => {
        expect(matchesPatternPart('baz', '!(foo|bar)')).toBe(true);
        expect(matchesPatternPart('test', '!(foo|bar)')).toBe(true);
      });
    });

    describe('AND WHEN using complex wildcard negation', () => {
      it('SHOULD not match files with test pattern in middle', () => {
        expect(matchesPatternPart('Component.test.js', '!(*.test.*)')).toBe(false);
        expect(matchesPatternPart('Button.test.tsx', '!(*.test.*)')).toBe(false);
      });

      it('SHOULD match files without test pattern in middle', () => {
        expect(matchesPatternPart('Component.spec.ts', '!(*.test.*)')).toBe(true);
        expect(matchesPatternPart('Component.js', '!(*.test.*)')).toBe(true);
      });
    });

    describe('AND WHEN using file extension negation', () => {
      it('SHOULD not match files with negated test extension', () => {
        expect(matchesPatternPart('file.test.js', '!(*.test.js)')).toBe(false);
      });

      it('SHOULD match files without negated test extension', () => {
        expect(matchesPatternPart('file.js', '!(*.test.js)')).toBe(true);
        expect(matchesPatternPart('file.spec.js', '!(*.test.js)')).toBe(true);
      });
    });

    describe('AND WHEN using negation with multiple wildcards', () => {
      it('SHOULD not match pattern with test in middle', () => {
        expect(matchesPatternPart('a.test.b', '!(*.test.*)')).toBe(false);
      });

      it('SHOULD match patterns without test in middle', () => {
        expect(matchesPatternPart('a.spec.b', '!(*.test.*)')).toBe(true);
        expect(matchesPatternPart('test.file', '!(*.test.*)')).toBe(true);
      });
    });

    describe('AND WHEN handling edge cases', () => {
      it('SHOULD handle empty negation patterns', () => {
        expect(matchesPatternPart('anything', '!()')).toBe(true);
        expect(matchesPatternPart('', '!()')).toBe(false);
      });

      it('SHOULD handle empty strings with negation', () => {
        expect(matchesPatternPart('', '!(foo)')).toBe(true);
        expect(matchesPatternPart('foo', '!(foo)')).toBe(false);
      });
    });

    describe('AND WHEN using nested extglob patterns', () => {
      it('SHOULD not match complex nested patterns', () => {
        expect(matchesPatternPart('foo.test.js', '!(*(foo).test.*)')).toBe(false);
      });

      it('SHOULD match strings not matching nested patterns', () => {
        expect(matchesPatternPart('bar.test.js', '!(*(foo).test.*)')).toBe(true);
        expect(matchesPatternPart('foo.spec.js', '!(*(foo).test.*)')).toBe(true);
      });
    });
  });

  describe('WHEN handling real-world ESLint patterns', () => {
    describe('AND WHEN using complex exclude patterns for test files', () => {
      it('SHOULD match non-test files', () => {
        expect(matchesPatternPart('Component.js', '!(*.test)')).toBe(true);
        expect(matchesPatternPart('Button.spec', '!(*.test)')).toBe(true);
      });

      it('SHOULD not match test files', () => {
        expect(matchesPatternPart('Component.test', '!(*.test)')).toBe(false);
        expect(matchesPatternPart('utils.test', '!(*.test)')).toBe(false);
      });
    });

    describe('AND WHEN using directory exclusion patterns', () => {
      it('SHOULD match allowed directories', () => {
        expect(matchesPatternPart('shared', '!(foobar)')).toBe(true);
        expect(matchesPatternPart('legacy', '!(foobar)')).toBe(true);
      });

      it('SHOULD not match excluded directories', () => {
        expect(matchesPatternPart('foobar', '!(foobar)')).toBe(false);
      });
    });

    describe('AND WHEN using multiple exclusion patterns', () => {
      it('SHOULD match directories not in exclusion list', () => {
        expect(matchesPatternPart('src', '!(node_modules|dist|build)')).toBe(true);
        expect(matchesPatternPart('lib', '!(node_modules|dist|build)')).toBe(true);
      });

      it('SHOULD not match directories in exclusion list', () => {
        expect(matchesPatternPart('node_modules', '!(node_modules|dist|build)')).toBe(false);
        expect(matchesPatternPart('dist', '!(node_modules|dist|build)')).toBe(false);
        expect(matchesPatternPart('build', '!(node_modules|dist|build)')).toBe(false);
      });
    });
  });

  describe('WHEN handling error cases', () => {
    describe('AND WHEN patterns are malformed', () => {
      it('SHOULD handle unclosed patterns gracefully', () => {
        expect(matchesPatternPart('test', '!(unclosed')).toBe(false);
        expect(matchesPatternPart('test', '!(')).toBe(false);
      });

      it('SHOULD handle empty negation patterns', () => {
        expect(matchesPatternPart('test', '!()')).toBe(true);
      });
    });

    describe('AND WHEN inputs are empty', () => {
      it('SHOULD match empty string to empty pattern', () => {
        expect(matchesPatternPart('', '')).toBe(true);
      });

      it('SHOULD not match non-empty string to empty pattern', () => {
        expect(matchesPatternPart('test', '')).toBe(false);
      });

      it('SHOULD not match empty string to non-empty pattern', () => {
        expect(matchesPatternPart('', 'test')).toBe(false);
      });
    });

    describe('AND WHEN segments contain special characters', () => {
      it('SHOULD handle hyphens correctly', () => {
        expect(matchesPatternPart('file-name', 'file-name')).toBe(true);
      });

      it('SHOULD handle underscores correctly', () => {
        expect(matchesPatternPart('file_name', 'file_name')).toBe(true);
      });

      it('SHOULD handle dots correctly', () => {
        expect(matchesPatternPart('file.name', 'file.name')).toBe(true);
      });
    });
  });
});
