/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse, TYPE } from '@formatjs/icu-messageformat-parser';

import { clearDocumentationDirectives, toDefaultMessage } from './docs';

const literalIcuText = (message: string): string => {
  const elements = parse(message, {
    requiresOtherClause: true,
    shouldParseSkeletons: false,
  });

  return elements
    .map((element) => {
      if (element.type !== TYPE.literal) {
        throw new Error(`Expected literal ICU text, got type ${element.type}`);
      }
      return element.value;
    })
    .join('');
};

describe('clearDocumentationDirectives', () => {
  it('should remove lowercase MyST directives', () => {
    const input = 'Documentation.{applies_to}`stack: preview 9.4`';
    const expected = 'Documentation.';
    expect(clearDocumentationDirectives(input)).toBe(expected);
  });

  it('should remove uppercase MyST directives', () => {
    const input = 'Documentation.{APPLIES_TO}`stack: preview 9.4`';
    const expected = 'Documentation.';
    expect(clearDocumentationDirectives(input)).toBe(expected);
  });

  it('should remove multiple directives', () => {
    const input = 'Documentation.{APPLIES_TO}`stack: preview 9.4`{OTHER_DIRECTIVE}`other content`';
    const expected = 'Documentation.';
    expect(clearDocumentationDirectives(input)).toBe(expected);
  });

  it('should keep capture references that use ${name}', () => {
    const input = 'substituting `${name}` with the matched `(?P<name>)` groups';
    expect(clearDocumentationDirectives(input)).toBe(input);
  });
});

describe('toDefaultMessage', () => {
  const labelReplaceDescription =
    'Matches the regular expression `regex` against the value of the label `src_label`. On a match, sets the label `dst_label` to the expansion of `replacement`, substituting `$1`, `$name`, and `${name}` with the matched capture groups; on no match the input series is returned unchanged. The destination can be a new label or an existing stored label (a dimension or `__name__`). Regular expressions use the RE2 engine (RE2 syntax including `(?P<name>)`, `$1`/`$name`/`${name}` replacement expansion, no backreferences, fully anchored as `^(?s:regex)$`), matching Prometheus. {applies_to}`stack: ga 9.7+` {applies_to}`serverless: ga` A call over a `by(...)` aggregation, directly or under `topk`, `bottomk`, `limitk`, or `limit_ratio`, is supported when the destination is a new label, such as `label_replace(sum by (job) (x), "dst", "$1", "job", "(.*)")`.';

  it('parses (?P<name>) as literal text when ignoreTag is unset', () => {
    const message = JSON.parse(toDefaultMessage('RE2 syntax including `(?P<name>)`'));

    expect(literalIcuText(message)).toBe('RE2 syntax including `(?P<name>)`');
  });

  it('turns ${name} into a literal {name}', () => {
    const message = JSON.parse(toDefaultMessage('substituting `${name}`'));

    expect(literalIcuText(message)).toBe('substituting `${name}`');
  });

  it('removes {applies_to} directives before quoting', () => {
    const message = JSON.parse(
      toDefaultMessage(
        'matching Prometheus. {applies_to}`stack: ga 9.7+` {applies_to}`serverless: ga` A call'
      )
    );

    expect(message).not.toContain('applies_to');
    expect(message).not.toContain('stack: ga 9.7+');
    expect(literalIcuText(message)).toBe('matching Prometheus.   A call');
  });

  it('parses the label_replace description', () => {
    const message = JSON.parse(toDefaultMessage(labelReplaceDescription));

    expect(message).not.toContain('applies_to');
    expect(literalIcuText(message)).toContain('(?P<name>)');
    expect(literalIcuText(message)).toContain('${name}');
  });

  it('keeps comparison operators unquoted', () => {
    const input = 'strict (`>`) by default and inclusive (`>=`), or (`<`) and (`<=`)';
    const message = JSON.parse(toDefaultMessage(input));

    expect(message).toBe(input);
    expect(literalIcuText(message)).toBe(input);
  });

  it('quotes braces next to angle brackets without splitting operators', () => {
    const message = JSON.parse(toDefaultMessage('<{foo}>'));

    expect(literalIcuText(message)).toBe('<{foo}>');
  });
});
