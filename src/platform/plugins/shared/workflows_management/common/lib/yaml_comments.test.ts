/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getYamlCommentRanges, isOffsetInYamlComment, stripYamlComments } from './yaml_comments';

describe('getYamlCommentRanges', () => {
  it('should return a range for a whole-line comment', () => {
    const text = '# whole line comment';
    const ranges = getYamlCommentRanges(text);
    expect(ranges).toHaveLength(1);
    expect(ranges[0].start).toBe(0);
    expect(ranges[0].end).toBe(text.length);
  });

  it('should return a range for an indented whole-line comment', () => {
    const text = 'key: value\n  # indented';
    const ranges = getYamlCommentRanges(text);
    expect(ranges).toHaveLength(1);
    expect(text.slice(ranges[0].start, ranges[0].end)).toContain('# indented');
  });

  it('should return a range for an inline comment after a value', () => {
    const text = 'key: value # inline comment';
    const ranges = getYamlCommentRanges(text);
    expect(ranges).toHaveLength(1);
    expect(text.slice(ranges[0].start, ranges[0].end)).toContain('# inline comment');
  });

  it('should return no ranges when # is inside a double-quoted string', () => {
    const text = 'key: "value # not a comment"';
    const ranges = getYamlCommentRanges(text);
    expect(ranges).toHaveLength(0);
  });

  it('should return no ranges when # is inside a single-quoted string', () => {
    const text = "key: 'value # not a comment'";
    const ranges = getYamlCommentRanges(text);
    expect(ranges).toHaveLength(0);
  });

  it('should return no ranges when there is no # at all', () => {
    const text = 'key: value';
    const ranges = getYamlCommentRanges(text);
    expect(ranges).toHaveLength(0);
  });

  it('should return multiple ranges for multiple comments', () => {
    const text = '# comment 1\nkey: value\n  # comment 2\nother: val';
    const ranges = getYamlCommentRanges(text);
    expect(ranges).toHaveLength(2);
  });

  it('should return no ranges for empty input', () => {
    expect(getYamlCommentRanges('')).toHaveLength(0);
  });

  it('should not treat # in block scalar content as a comment', () => {
    const text = `key: |
  Hello # this is content
  not a comment`;
    const ranges = getYamlCommentRanges(text);
    expect(ranges).toHaveLength(0);
  });

  it('should not treat # in folded block scalar content as a comment', () => {
    const text = `key: >
  Hello # this is also content
  still content`;
    const ranges = getYamlCommentRanges(text);
    expect(ranges).toHaveLength(0);
  });

  it('should detect a comment after a block scalar header', () => {
    const text = `key: | # header comment
  content here`;
    const ranges = getYamlCommentRanges(text);
    expect(ranges).toHaveLength(1);
    expect(text.slice(ranges[0].start, ranges[0].end)).toContain('# header comment');
  });

  it('should return ranges sorted by start offset', () => {
    const text = '# first\nkey: value # second\n# third';
    const ranges = getYamlCommentRanges(text);
    expect(ranges.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i].start).toBeGreaterThan(ranges[i - 1].start);
    }
  });
});

describe('isOffsetInYamlComment', () => {
  describe('whole-line comments', () => {
    it('should return true for an offset on a line starting with #', () => {
      const text = '# this is a comment with {{ var }}';
      const ranges = getYamlCommentRanges(text);
      expect(isOffsetInYamlComment(ranges, 27)).toBe(true);
    });

    it('should return true for an offset on a line starting with whitespace then #', () => {
      const text = 'key: value\n  # indented comment {{ var }}';
      const ranges = getYamlCommentRanges(text);
      const varOffset = text.indexOf('{{ var }}');
      expect(isOffsetInYamlComment(ranges, varOffset)).toBe(true);
    });

    it('should return false for an offset on a non-comment line', () => {
      const text = 'key: "{{ value }}"';
      const ranges = getYamlCommentRanges(text);
      expect(isOffsetInYamlComment(ranges, 6)).toBe(false);
    });

    it('should return false for a # character inside a double-quoted string value', () => {
      const text = 'key: "value # not a comment {{ var }}"';
      const ranges = getYamlCommentRanges(text);
      expect(isOffsetInYamlComment(ranges, 29)).toBe(false);
    });

    it('should handle multi-line text and detect comment on second line', () => {
      const text = 'key: value\n# comment with {{ var }}';
      const ranges = getYamlCommentRanges(text);
      const commentOffset = text.indexOf('{{ var }}');
      expect(isOffsetInYamlComment(ranges, commentOffset)).toBe(true);
    });

    it('should handle multi-line text and detect non-comment on first line', () => {
      const text = 'key: "{{ value }}"\n# comment';
      const ranges = getYamlCommentRanges(text);
      expect(isOffsetInYamlComment(ranges, 6)).toBe(false);
    });

    it('should return false for an empty line', () => {
      const text = 'line1: a\n\nline3: b';
      const ranges = getYamlCommentRanges(text);
      expect(isOffsetInYamlComment(ranges, 9)).toBe(false);
    });

    it('should return true for a comment at the very start of the text', () => {
      const text = '# {{ var }}\nkey: value';
      const ranges = getYamlCommentRanges(text);
      expect(isOffsetInYamlComment(ranges, 2)).toBe(true);
    });

    it('should return true for a comment on the last line with no trailing newline', () => {
      const text = 'key: value\n# {{ var }}';
      const ranges = getYamlCommentRanges(text);
      const commentOffset = text.indexOf('{{ var }}');
      expect(isOffsetInYamlComment(ranges, commentOffset)).toBe(true);
    });
  });

  describe('inline comments', () => {
    it('should return true for an offset in the inline comment portion', () => {
      const text = 'key: value # {{ commentVar }}';
      const ranges = getYamlCommentRanges(text);
      const varOffset = text.indexOf('{{ commentVar }}');
      expect(isOffsetInYamlComment(ranges, varOffset)).toBe(true);
    });

    it('should return false for an offset in the value portion before an inline comment', () => {
      const text = 'key: "{{ value }}" # comment';
      const ranges = getYamlCommentRanges(text);
      const varOffset = text.indexOf('{{ value }}');
      expect(isOffsetInYamlComment(ranges, varOffset)).toBe(false);
    });

    it('should return false when # is inside a double-quoted string followed by an inline comment', () => {
      const text = 'key: "val # not comment" # {{ realComment }}';
      const ranges = getYamlCommentRanges(text);
      const quotedHash = text.indexOf('# not');
      const commentVar = text.indexOf('{{ realComment }}');
      expect(isOffsetInYamlComment(ranges, quotedHash)).toBe(false);
      expect(isOffsetInYamlComment(ranges, commentVar)).toBe(true);
    });

    it('should return false when # is inside a single-quoted string', () => {
      const text = "key: 'val # not comment'";
      const ranges = getYamlCommentRanges(text);
      const hashOffset = text.indexOf('# not');
      expect(isOffsetInYamlComment(ranges, hashOffset)).toBe(false);
    });

    it('should handle inline comment in multi-line text', () => {
      const text = 'first: value\nsecond: val # {{ inlineVar }}\nthird: other';
      const ranges = getYamlCommentRanges(text);
      const varOffset = text.indexOf('{{ inlineVar }}');
      const secondValueOffset = text.indexOf('second');
      expect(isOffsetInYamlComment(ranges, varOffset)).toBe(true);
      expect(isOffsetInYamlComment(ranges, secondValueOffset)).toBe(false);
    });

    it('should return true at the # character itself', () => {
      const text = 'key: value # comment';
      const ranges = getYamlCommentRanges(text);
      const hashOffset = text.indexOf('#');
      expect(isOffsetInYamlComment(ranges, hashOffset)).toBe(true);
    });
  });

  describe('block scalars', () => {
    it('should return false for # inside a literal block scalar', () => {
      const text = `key: |
  Hello # this is content {{ var }}`;
      const ranges = getYamlCommentRanges(text);
      const hashOffset = text.indexOf('# this');
      expect(isOffsetInYamlComment(ranges, hashOffset)).toBe(false);
    });

    it('should return false for # inside a folded block scalar', () => {
      const text = `key: >
  Hello # this is content {{ var }}`;
      const ranges = getYamlCommentRanges(text);
      const hashOffset = text.indexOf('# this');
      expect(isOffsetInYamlComment(ranges, hashOffset)).toBe(false);
    });

    it('should return false for {{ var }} inside block scalar with # on same line', () => {
      const text = `message: |
  Hello # world {{ steps.foo.output }}`;
      const ranges = getYamlCommentRanges(text);
      const varOffset = text.indexOf('{{ steps.foo.output }}');
      expect(isOffsetInYamlComment(ranges, varOffset)).toBe(false);
    });
  });
});

describe('stripYamlComments', () => {
  describe('whole-line comments', () => {
    it('should replace a comment with spaces preserving length', () => {
      const text = '# this is a comment';
      const result = stripYamlComments(text);
      expect(result.length).toBe(text.length);
      expect(result.trim()).toBe('');
    });

    it('should not modify non-comment lines', () => {
      const text = 'key: value';
      expect(stripYamlComments(text)).toBe(text);
    });

    it('should not modify lines with # inside double-quoted string values', () => {
      const text = 'key: "value # not a comment"';
      expect(stripYamlComments(text)).toBe(text);
    });

    it('should preserve string length and line count for multi-line input', () => {
      const text = 'line1: value\n# comment {{ var }}\nline3: other';
      const result = stripYamlComments(text);
      expect(result.length).toBe(text.length);
      expect(result.split('\n').length).toBe(text.split('\n').length);
    });

    it('should strip multiple comment lines', () => {
      const text = '# comment 1\nkey: value\n  # comment 2\nother: val';
      const result = stripYamlComments(text);
      expect(result).toContain('key: value');
      expect(result).toContain('other: val');
      expect(result).not.toContain('comment 1');
      expect(result).not.toContain('comment 2');
    });

    it('should handle empty input', () => {
      expect(stripYamlComments('')).toBe('');
    });

    it('should handle input with only comment lines', () => {
      const text = '# line 1\n# line 2';
      const result = stripYamlComments(text);
      expect(result.length).toBe(text.length);
      expect(result.trim()).toBe('');
    });

    it('should handle a realistic YAML workflow with comments', () => {
      const text = `name: test
# This step uses {{ steps.foo.output }}
steps:
  - name: step1
    # type: {{ dynamic_type }}
    type: console
    with:
      message: "{{ inputs.message }}"`;
      const result = stripYamlComments(text);
      expect(result.length).toBe(text.length);
      expect(result).not.toContain('# This step');
      expect(result).not.toContain('# type:');
      expect(result).toContain('name: test');
      expect(result).toContain('message: "{{ inputs.message }}"');
    });
  });

  describe('inline comments', () => {
    it('should strip the inline comment portion while preserving the value', () => {
      const text = 'key: value # inline {{ var }}';
      const result = stripYamlComments(text);
      expect(result.length).toBe(text.length);
      expect(result).toContain('key: value');
      expect(result).not.toContain('{{ var }}');
    });

    it('should not strip # inside a double-quoted string even if followed by an inline comment', () => {
      const text = 'key: "val # inside" # {{ realComment }}';
      const result = stripYamlComments(text);
      expect(result.length).toBe(text.length);
      expect(result).toContain('key: "val # inside"');
      expect(result).not.toContain('{{ realComment }}');
    });

    it('should not strip # inside a single-quoted string', () => {
      const text = "key: 'val # inside'";
      const result = stripYamlComments(text);
      expect(result).toBe(text);
    });

    it('should handle mixed whole-line and inline comments', () => {
      const text = '# whole line\nkey: value # inline {{ var }}\nother: ok';
      const result = stripYamlComments(text);
      expect(result).toContain('key: value');
      expect(result).not.toContain('{{ var }}');
      expect(result).toContain('other: ok');
      expect(result.length).toBe(text.length);
    });

    it('should handle tab-separated inline comments', () => {
      const text = 'key: value\t# {{ tabComment }}';
      const result = stripYamlComments(text);
      expect(result.length).toBe(text.length);
      expect(result).not.toContain('{{ tabComment }}');
    });

    it('should handle a realistic workflow line with inline comment', () => {
      const text = `name: test
steps:
  - name: step1
    type: console # was previously elasticsearch.search {{ old }}
    with:
      message: "{{ inputs.message }}"`;
      const result = stripYamlComments(text);
      expect(result.length).toBe(text.length);
      expect(result).not.toContain('{{ old }}');
      expect(result).toContain('message: "{{ inputs.message }}"');
    });
  });

  describe('block scalars', () => {
    it('should NOT strip # inside a literal block scalar', () => {
      const text = `key: |
  Hello # this is content
  not a comment`;
      const result = stripYamlComments(text);
      expect(result).toBe(text);
    });

    it('should NOT strip # inside a folded block scalar', () => {
      const text = `key: >
  Hello # this is also content
  still content`;
      const result = stripYamlComments(text);
      expect(result).toBe(text);
    });

    it('should preserve liquid variables inside block scalars that follow #', () => {
      const text = `message: |
  Hello # world {{ steps.foo.output }}
  second line`;
      const result = stripYamlComments(text);
      expect(result).toBe(text);
      expect(result).toContain('{{ steps.foo.output }}');
    });

    it('should strip a comment after block scalar header but not the content', () => {
      const text = `key: | # header comment
  content with # hash here`;
      const result = stripYamlComments(text);
      expect(result.length).toBe(text.length);
      expect(result).not.toContain('header comment');
      expect(result).toContain('content with # hash here');
    });
  });
});
