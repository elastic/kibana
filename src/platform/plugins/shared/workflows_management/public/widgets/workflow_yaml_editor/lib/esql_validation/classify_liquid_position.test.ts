/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  applyLiquidMask,
  classifyLiquidPosition,
  findMaskedRangeAtOffset,
  isOffsetInsideMaskedRange,
} from './classify_liquid_position';

describe('classifyLiquidPosition', () => {
  it('returns safe with no masks for plain ES|QL', () => {
    const result = classifyLiquidPosition('FROM logs-* | LIMIT 10');
    expect(result.kind).toBe('safe');
    if (result.kind === 'safe') {
      expect(result.maskedRanges).toEqual([]);
    }
  });

  it('returns safe with no masks for empty input', () => {
    const result = classifyLiquidPosition('');
    expect(result.kind).toBe('safe');
    if (result.kind === 'safe') {
      expect(result.maskedRanges).toEqual([]);
    }
  });

  it('classifies a {{ … }} span inside a double-quoted string as maskable', () => {
    const text = 'FROM logs-* | WHERE host == "{{ inputs.host }}"';
    const result = classifyLiquidPosition(text);
    expect(result.kind).toBe('safe');
    if (result.kind === 'safe') {
      expect(result.maskedRanges).toEqual([
        { start: text.indexOf('{{'), end: text.indexOf('}}') + 2, kind: 'expression' },
      ]);
    }
  });

  it('classifies multiple in-string spans as maskable', () => {
    const text = 'WHERE a == "{{ x }}" AND b == "{{ y }}"';
    const result = classifyLiquidPosition(text);
    expect(result.kind).toBe('safe');
    if (result.kind === 'safe') {
      expect(result.maskedRanges).toHaveLength(2);
    }
  });

  it('classifies a {{ … }} span in identifier position as structural', () => {
    expect(classifyLiquidPosition('FROM logs-{{ inputs.env }}-*').kind).toBe('has-structural');
  });

  it('classifies `{% … %}` outside a string as structural', () => {
    expect(classifyLiquidPosition('{%- if env -%} FROM logs {%- endif -%}').kind).toBe(
      'has-structural'
    );
  });

  it('treats `{# … #}` as maskable even outside a string (Liquid comments are inert)', () => {
    const text = 'FROM logs-* {# pick the right index #} | LIMIT 10';
    const result = classifyLiquidPosition(text);
    expect(result.kind).toBe('safe');
    if (result.kind === 'safe') {
      expect(result.maskedRanges).toEqual([
        { start: text.indexOf('{#'), end: text.indexOf('#}') + 2, kind: 'comment' },
      ]);
    }
  });

  it('still classifies as structural when a structural span sits alongside in-string spans', () => {
    expect(classifyLiquidPosition('FROM logs-{{ env }}-* | WHERE x == "{{ y }}"').kind).toBe(
      'has-structural'
    );
  });

  it('classifies a Liquid span inside `"""…"""` as maskable', () => {
    const text = 'WHERE x == """foo {{ bar }} baz"""';
    const result = classifyLiquidPosition(text);
    expect(result.kind).toBe('safe');
    if (result.kind === 'safe') {
      expect(result.maskedRanges).toEqual([
        { start: text.indexOf('{{'), end: text.indexOf('}}') + 2, kind: 'expression' },
      ]);
    }
  });

  it('respects ES|QL string escapes (\\" does not close the string)', () => {
    // The `"` inside the string is escaped; the cursor is still in-string when
    // it reaches `{{ env }}`, so the span must be classified as in-string.
    const text = 'WHERE x == "a \\"quoted\\" {{ env }} tail"';
    const result = classifyLiquidPosition(text);
    expect(result.kind).toBe('safe');
  });

  it('classifies Liquid inside an ES|QL line comment as maskable', () => {
    const text = 'FROM logs-* // {{ debug }}\n| LIMIT 10';
    const result = classifyLiquidPosition(text);
    expect(result.kind).toBe('safe');
  });

  it('classifies Liquid inside an ES|QL block comment as maskable', () => {
    const text = 'FROM logs-* /* note: {{ debug }} */ | LIMIT 10';
    const result = classifyLiquidPosition(text);
    expect(result.kind).toBe('safe');
  });

  it('returns has-structural for an unclosed `{{` outside a string', () => {
    expect(classifyLiquidPosition('FROM logs-* | LIMIT {{ nope').kind).toBe('has-structural');
  });

  it('returns has-structural for an unclosed `{#` outside a string', () => {
    expect(classifyLiquidPosition('FROM logs-* {# unclosed').kind).toBe('has-structural');
  });
});

describe('applyLiquidMask', () => {
  it('returns the input unchanged when ranges is empty', () => {
    expect(applyLiquidMask('FROM logs-*', [])).toBe('FROM logs-*');
  });

  it('replaces each range with whitespace of the same length', () => {
    const text = 'WHERE host == "{{ env }}"';
    const ranges = [
      { start: text.indexOf('{{'), end: text.indexOf('}}') + 2, kind: 'expression' as const },
    ];
    const masked = applyLiquidMask(text, ranges);
    expect(masked).toHaveLength(text.length);
    expect(masked).toBe('WHERE host == "         "');
  });

  it('handles multiple non-overlapping ranges', () => {
    const text = 'a "{{ x }}" "{{ y }}" b';
    const ranges = [
      { start: text.indexOf('{{ x'), end: text.indexOf('}}') + 2, kind: 'expression' as const },
      {
        start: text.lastIndexOf('{{'),
        end: text.lastIndexOf('}}') + 2,
        kind: 'expression' as const,
      },
    ];
    const masked = applyLiquidMask(text, ranges);
    expect(masked).toHaveLength(text.length);
    expect(masked.includes('{{')).toBe(false);
    expect(masked.includes('}}')).toBe(false);
  });
});

describe('findMaskedRangeAtOffset', () => {
  const ranges = [
    { start: 10, end: 20, kind: 'comment' as const },
    { start: 30, end: 40, kind: 'expression' as const },
  ];

  it('returns the containing range with its kind', () => {
    expect(findMaskedRangeAtOffset(15, ranges)?.kind).toBe('comment');
    expect(findMaskedRangeAtOffset(35, ranges)?.kind).toBe('expression');
  });

  it('returns null when offset is outside every range', () => {
    expect(findMaskedRangeAtOffset(25, ranges)).toBeNull();
  });
});

describe('isOffsetInsideMaskedRange', () => {
  const ranges = [
    { start: 10, end: 20, kind: 'expression' as const },
    { start: 30, end: 40, kind: 'expression' as const },
  ];

  it('is true for offsets inside a range', () => {
    expect(isOffsetInsideMaskedRange(15, ranges)).toBe(true);
    expect(isOffsetInsideMaskedRange(35, ranges)).toBe(true);
  });

  it('treats range end as exclusive', () => {
    expect(isOffsetInsideMaskedRange(20, ranges)).toBe(false);
    expect(isOffsetInsideMaskedRange(40, ranges)).toBe(false);
  });

  it('is false for offsets outside any range', () => {
    expect(isOffsetInsideMaskedRange(0, ranges)).toBe(false);
    expect(isOffsetInsideMaskedRange(25, ranges)).toBe(false);
    expect(isOffsetInsideMaskedRange(50, ranges)).toBe(false);
  });
});
