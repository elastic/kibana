/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  findInlineCommentStart,
  isOffsetInYamlComment,
  stripYamlCommentLines,
} from './yaml_comments';

describe('findInlineCommentStart', () => {
  it('should return 0 for a whole-line comment', () => {
    expect(findInlineCommentStart('# whole line comment')).toBe(0);
  });

  it('should return the indented # offset for an indented whole-line comment', () => {
    expect(findInlineCommentStart('  # indented')).toBe(2);
  });

  it('should return the # offset for an inline comment after a value', () => {
    expect(findInlineCommentStart('key: value  # inline comment')).toBe(12);
  });

  it('should return the # offset for a tab-separated inline comment', () => {
    expect(findInlineCommentStart('key: value\t# inline comment')).toBe(11);
  });

  it('should return -1 when # is inside double-quoted string', () => {
    expect(findInlineCommentStart('key: "value # not a comment"')).toBe(-1);
  });

  it('should return -1 when # is inside single-quoted string', () => {
    expect(findInlineCommentStart("key: 'value # not a comment'")).toBe(-1);
  });

  it('should return -1 when there is no # at all', () => {
    expect(findInlineCommentStart('key: value')).toBe(-1);
  });

  it('should return -1 when # has no preceding whitespace', () => {
    expect(findInlineCommentStart('color:#fff')).toBe(-1);
  });

  it('should handle escaped double quotes inside double-quoted strings', () => {
    expect(findInlineCommentStart('key: "value \\" still # inside"')).toBe(-1);
  });

  it('should handle doubled single quotes (YAML escape) inside single-quoted strings', () => {
    expect(findInlineCommentStart("key: 'it''s # inside'")).toBe(-1);
  });

  it('should find comment after a closing double-quoted string', () => {
    expect(findInlineCommentStart('key: "value" # comment')).toBe(13);
  });

  it('should find comment after a closing single-quoted string', () => {
    expect(findInlineCommentStart("key: 'value' # comment")).toBe(13);
  });

  it('should return -1 for an empty line', () => {
    expect(findInlineCommentStart('')).toBe(-1);
  });
});

describe('isOffsetInYamlComment', () => {
  describe('whole-line comments', () => {
    it('should return true for an offset on a line starting with #', () => {
      const text = '# this is a comment with {{ var }}';
      expect(isOffsetInYamlComment(text, 27)).toBe(true);
    });

    it('should return true for an offset on a line starting with whitespace then #', () => {
      const text = '  # indented comment {{ var }}';
      expect(isOffsetInYamlComment(text, 22)).toBe(true);
    });

    it('should return true for a tab-indented comment', () => {
      const text = '\t# tab comment {{ var }}';
      expect(isOffsetInYamlComment(text, 16)).toBe(true);
    });

    it('should return false for an offset on a non-comment line', () => {
      const text = 'key: "{{ value }}"';
      expect(isOffsetInYamlComment(text, 6)).toBe(false);
    });

    it('should return false for a # character inside a double-quoted string value', () => {
      const text = 'key: "value # not a comment {{ var }}"';
      expect(isOffsetInYamlComment(text, 29)).toBe(false);
    });

    it('should handle multi-line text and detect comment on second line', () => {
      const text = 'key: value\n# comment with {{ var }}';
      const commentOffset = text.indexOf('{{ var }}');
      expect(isOffsetInYamlComment(text, commentOffset)).toBe(true);
    });

    it('should handle multi-line text and detect non-comment on first line', () => {
      const text = 'key: "{{ value }}"\n# comment';
      expect(isOffsetInYamlComment(text, 6)).toBe(false);
    });

    it('should return false for an empty line', () => {
      const text = 'line1\n\nline3';
      expect(isOffsetInYamlComment(text, 6)).toBe(false);
    });

    it('should return true for a comment at the very start of the text', () => {
      const text = '# {{ var }}\nkey: value';
      expect(isOffsetInYamlComment(text, 2)).toBe(true);
    });

    it('should return true for a comment on the last line with no trailing newline', () => {
      const text = 'key: value\n# {{ var }}';
      const commentOffset = text.indexOf('{{ var }}');
      expect(isOffsetInYamlComment(text, commentOffset)).toBe(true);
    });
  });

  describe('inline comments', () => {
    it('should return true for an offset in the inline comment portion', () => {
      const text = 'key: value  # {{ commentVar }}';
      const varOffset = text.indexOf('{{ commentVar }}');
      expect(isOffsetInYamlComment(text, varOffset)).toBe(true);
    });

    it('should return false for an offset in the value portion before an inline comment', () => {
      const text = 'key: {{ value }}  # comment';
      const varOffset = text.indexOf('{{ value }}');
      expect(isOffsetInYamlComment(text, varOffset)).toBe(false);
    });

    it('should return false when # is inside a double-quoted string followed by an inline comment', () => {
      const text = 'key: "val # not comment" # {{ realComment }}';
      const quotedHash = text.indexOf('# not');
      const commentVar = text.indexOf('{{ realComment }}');
      expect(isOffsetInYamlComment(text, quotedHash)).toBe(false);
      expect(isOffsetInYamlComment(text, commentVar)).toBe(true);
    });

    it('should return false when # is inside a single-quoted string', () => {
      const text = "key: 'val # not comment'";
      const hashOffset = text.indexOf('# not');
      expect(isOffsetInYamlComment(text, hashOffset)).toBe(false);
    });

    it('should handle inline comment in multi-line text', () => {
      const text = 'first: value\nsecond: val  # {{ inlineVar }}\nthird: other';
      const varOffset = text.indexOf('{{ inlineVar }}');
      const secondValueOffset = text.indexOf('second');
      expect(isOffsetInYamlComment(text, varOffset)).toBe(true);
      expect(isOffsetInYamlComment(text, secondValueOffset)).toBe(false);
    });

    it('should return true at the # character itself', () => {
      const text = 'key: value # comment';
      const hashOffset = text.indexOf('#');
      expect(isOffsetInYamlComment(text, hashOffset)).toBe(true);
    });
  });
});

describe('stripYamlCommentLines', () => {
  describe('whole-line comments', () => {
    it('should replace a comment line with spaces of equal length', () => {
      const text = '# this is a comment';
      const result = stripYamlCommentLines(text);
      expect(result).toBe(' '.repeat(text.length));
      expect(result.length).toBe(text.length);
    });

    it('should replace an indented comment line with spaces of equal length', () => {
      const text = '  # indented comment';
      const result = stripYamlCommentLines(text);
      expect(result).toBe(' '.repeat(text.length));
    });

    it('should not modify non-comment lines', () => {
      const text = 'key: value';
      expect(stripYamlCommentLines(text)).toBe(text);
    });

    it('should not modify lines with # inside double-quoted string values', () => {
      const text = 'key: "value # not a comment"';
      expect(stripYamlCommentLines(text)).toBe(text);
    });

    it('should preserve string length and line count for multi-line input', () => {
      const text = 'line1: value\n# comment {{ var }}\nline3: other';
      const result = stripYamlCommentLines(text);
      expect(result.length).toBe(text.length);
      expect(result.split('\n').length).toBe(text.split('\n').length);
    });

    it('should strip multiple comment lines', () => {
      const text = '# comment 1\nkey: value\n  # comment 2\nother: val';
      const result = stripYamlCommentLines(text);
      const lines = result.split('\n');
      expect(lines[0]).toBe(' '.repeat('# comment 1'.length));
      expect(lines[1]).toBe('key: value');
      expect(lines[2]).toBe(' '.repeat('  # comment 2'.length));
      expect(lines[3]).toBe('other: val');
    });

    it('should handle empty input', () => {
      expect(stripYamlCommentLines('')).toBe('');
    });

    it('should handle input with only comment lines', () => {
      const text = '# line 1\n# line 2';
      const result = stripYamlCommentLines(text);
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
      const result = stripYamlCommentLines(text);
      expect(result.length).toBe(text.length);
      expect(result).not.toContain('# This step');
      expect(result).not.toContain('# type:');
      expect(result).toContain('name: test');
      expect(result).toContain('message: "{{ inputs.message }}"');
    });
  });

  describe('inline comments', () => {
    it('should strip the inline comment portion while preserving the value', () => {
      const text = 'key: value  # inline {{ var }}';
      const result = stripYamlCommentLines(text);
      expect(result.length).toBe(text.length);
      expect(result).toBe(`key: value  ${' '.repeat('# inline {{ var }}'.length)}`);
    });

    it('should not strip # inside a double-quoted string even if followed by an inline comment', () => {
      const text = 'key: "val # inside" # {{ realComment }}';
      const result = stripYamlCommentLines(text);
      expect(result.length).toBe(text.length);
      expect(result).toContain('key: "val # inside"');
      expect(result).not.toContain('{{ realComment }}');
    });

    it('should not strip # inside a single-quoted string', () => {
      const text = "key: 'val # inside'";
      const result = stripYamlCommentLines(text);
      expect(result).toBe(text);
    });

    it('should handle mixed whole-line and inline comments', () => {
      const text = '# whole line\nkey: value # inline {{ var }}\nother: ok';
      const result = stripYamlCommentLines(text);
      const lines = result.split('\n');
      expect(lines[0]).toBe(' '.repeat('# whole line'.length));
      expect(lines[1]).toContain('key: value');
      expect(lines[1]).not.toContain('{{ var }}');
      expect(lines[2]).toBe('other: ok');
      expect(result.length).toBe(text.length);
    });

    it('should handle tab-separated inline comments', () => {
      const text = 'key: value\t# {{ tabComment }}';
      const result = stripYamlCommentLines(text);
      expect(result.length).toBe(text.length);
      expect(result).toContain('key: value\t');
      expect(result).not.toContain('{{ tabComment }}');
    });

    it('should handle a realistic workflow line with inline comment', () => {
      const text = `name: test
steps:
  - name: step1
    type: console  # was previously elasticsearch.search {{ old }}
    with:
      message: "{{ inputs.message }}"`;
      const result = stripYamlCommentLines(text);
      expect(result.length).toBe(text.length);
      expect(result).toContain('type: console  ');
      expect(result).not.toContain('{{ old }}');
      expect(result).toContain('message: "{{ inputs.message }}"');
    });
  });
});
