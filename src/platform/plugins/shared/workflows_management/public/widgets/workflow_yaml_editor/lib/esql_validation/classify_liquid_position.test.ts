/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { classifyLiquidPosition, type LiquidMaskedRangeKind } from './classify_liquid_position';

function maskedKinds(text: string): readonly LiquidMaskedRangeKind[] {
  const result = classifyLiquidPosition(text);
  if (result.kind !== 'all-maskable') {
    throw new Error(`Expected 'all-maskable', got '${result.kind}' for "${text}"`);
  }
  return result.maskedRanges.map((r) => r.kind);
}

describe('classifyLiquidPosition — masked range kinds', () => {
  it('tags `{{ … }}` inside a string literal as `expression`', () => {
    expect(maskedKinds('WHERE host == "{{ inputs.host }}"')).toEqual(['expression']);
  });

  it('tags `{% … %}` inside a string literal as `tag`', () => {
    // Stray block tags inside string literals are unusual but legal Liquid;
    // the masker still treats them as safe spans.
    expect(maskedKinds('WHERE x == "{% if x %}prod{% endif %}"')).toEqual(['tag', 'tag']);
  });

  it('tags `{# … #}` as `comment` even when it sits at the top level', () => {
    // Liquid comments are safe everywhere — at top level OR inside a string.
    // The classifier emits a `comment` masked range without flagging the
    // query as structural, because the comment expands to nothing.
    expect(maskedKinds('FROM logs-* {# todo: filter by env #} | LIMIT 10')).toEqual(['comment']);
  });

  it('tags `{# … #}` inside a string literal as `comment`', () => {
    expect(maskedKinds('WHERE host == "{# disabled #}"')).toEqual(['comment']);
  });

  it('reports each Liquid construct in a mixed query with its own kind', () => {
    expect(
      maskedKinds(
        'FROM logs {# audit #} | WHERE host == "{{ inputs.host }}" /* {% if env == "prod" %}log{% endif %} */'
      )
    ).toEqual(['comment', 'expression', 'tag', 'tag']);
  });

  it('classifies a structural `{{ … }}` as `has-structural`, NOT all-maskable', () => {
    // FROM logs-{{ env }}-* — Liquid sits at an identifier position. The
    // classifier short-circuits before producing any masked ranges, so the
    // caller can bail without inspecting kinds.
    const result = classifyLiquidPosition('FROM logs-{{ env }}-*');
    expect(result.kind).toBe('has-structural');
  });

  it('returns `no-liquid` for queries without Liquid markers', () => {
    expect(classifyLiquidPosition('FROM logs-* | WHERE x == 1').kind).toBe('no-liquid');
  });
});
