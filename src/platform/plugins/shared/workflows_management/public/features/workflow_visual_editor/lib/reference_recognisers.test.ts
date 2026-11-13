/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataReferenceCatalog } from './build_data_reference_catalog';
import { findReferenceTokens } from './reference_tokens';
import {
  isSingleValueReference,
  lookupReferenceTypeLabel,
  normalizeReferenceForm,
  parseWholeReference,
} from './reference_value';
import type { StepFormField } from './step_form_schema';
import { validateStepField } from './step_form_schema';

/**
 * The recognisers that read a `{{ }}` / `${{ }}` reference must agree on the same edge inputs.
 * The engine is the authority: it treats a value as the value form only when it starts with
 * `${{` and ends with `}}` exactly, so a padded `" ${{ a }}"` is not one. Rows marked NEW changed
 * when the recognisers were unified on one scanner; every other row is what they always did.
 */
const catalog: DataReferenceCatalog = {
  groups: [
    {
      id: 'context',
      title: 'Workflow context',
      description: '',
      items: [
        {
          path: 'consts.name',
          label: 'name',
          typeLabel: 'string',
          drillable: false,
          originLabel: 'Workflow context',
        },
      ],
    },
  ],
};

describe('parseWholeReference', () => {
  it.each([
    ['{{ a }}', { form: 'text', expression: 'a' }],
    ['${{ a }}', { form: 'value', expression: 'a' }],
    ['{{a}}', { form: 'text', expression: 'a' }],
    ['{{ steps.a.output | json }}', { form: 'text', expression: 'steps.a.output | json' }],
    ['NEW: {{- a -}}', { form: 'text', expression: 'a' }],
    ['NEW: {{ x | default: "}}" }}', { form: 'text', expression: 'x | default: "}}"' }],
    ['NEW: {{ x | append: "{{" }}', { form: 'text', expression: 'x | append: "{{"' }],
  ])('%s is a whole reference', (value, expected) => {
    const input = value.replace(/^NEW: /, '');
    expect(parseWholeReference(input)).toEqual(expected);
  });

  it.each([
    ['NEW: {{ a }}}', '{{ a }}}'],
    [' {{ a }}', ' {{ a }}'],
    ['{{ a }} ', '{{ a }} '],
    [' ${{ a }}', ' ${{ a }}'],
    ['${{ a }} ', '${{ a }} '],
    ['two references', '{{ a }} {{ b }}'],
    ['a reference inside a sentence', 'hello {{ a }}'],
    ['an opening inside the expression', '{{ a {{ b }}'],
    ['an empty expression', '{{ }}'],
    ['nothing', ''],
    ['text', 'text'],
  ])('is not a whole reference: %s', (_label, value) => {
    expect(parseWholeReference(value)).toBeUndefined();
  });

  it.each([5, true, null, undefined, {}, ['{{ a }}']])('is not for a non-string: %p', (value) => {
    expect(parseWholeReference(value)).toBeUndefined();
  });
});

describe('normalizeReferenceForm', () => {
  it.each([
    ['a whole text reference becomes the value form', '{{ a }}', '${{ a }}'],
    ['a whole value reference stays', '${{ a }}', '${{ a }}'],
    ['a value form inside a sentence becomes text', 'x ${{ a }} y', 'x {{ a }} y'],
    [
      'every value form in a sentence becomes text',
      'c ${{ a }} and ${{ b }}',
      'c {{ a }} and {{ b }}',
    ],
    ['a padded value form is not whole, so it becomes text', ' ${{ a }}', ' {{ a }}'],
    ['text with no reference is left alone', 'cost $5 and {{', 'cost $5 and {{'],
    ['NEW: a stray brace after a reference leaves it alone', '{{ a }}}', '{{ a }}}'],
    [
      'NEW: an unfinished `${{` is not a reference, so it is left alone',
      'abc ${{ unfinished',
      'abc ${{ unfinished',
    ],
    [
      'NEW: a quoted `${{` inside an expression is not rewritten',
      'see {{ x | append: "${{" }} ok',
      'see {{ x | append: "${{" }} ok',
    ],
    [
      'NEW: a whole reference with a quoted `${{` keeps it',
      '{{ x | append: "${{" }}',
      '${{ x | append: "${{" }}',
    ],
  ])('%s', (_label, text, expected) => {
    expect(normalizeReferenceForm(text)).toBe(expected);
  });
});

describe('findReferenceTokens', () => {
  it('reads the expression without whitespace-control dashes, so the catalog can type it (NEW)', () => {
    const [token] = findReferenceTokens('{{- consts.name -}}', { catalog });
    expect(token).toMatchObject({ expression: 'consts.name', typeLabel: 'string' });
  });

  it('is whole for a text reference padded with spaces, as before', () => {
    expect(findReferenceTokens(' {{ a }} ')[0]).toMatchObject({ isWhole: true, tone: 'neutral' });
  });

  it('is whole for a value reference that is the entire value', () => {
    expect(findReferenceTokens('${{ a }}')[0]).toMatchObject({ isWhole: true, tone: 'neutral' });
  });

  it('is not whole, and is flagged, for a value reference padded with spaces: the engine would print a `$` (NEW)', () => {
    expect(findReferenceTokens(' ${{ a }}')[0]).toMatchObject({ isWhole: false, tone: 'warning' });
    expect(findReferenceTokens('${{ a }} ')[0]).toMatchObject({ isWhole: false, tone: 'warning' });
  });

  it('is not whole when a stray brace follows, as before', () => {
    const tokens = findReferenceTokens('{{ a }}}');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].isWhole).toBe(false);
  });

  it('closes a reference on a `}}` that is not inside quotes (NEW)', () => {
    const tokens = findReferenceTokens('{{ x | default: "}}" }}');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({ expression: 'x | default: "}}"', isWhole: true });
  });

  it('still lets a quote filled in a JSON string count as the whole value', () => {
    expect(findReferenceTokens('"${{ a }}"', { quotedStringsAreValues: true })[0].isWhole).toBe(
      true
    );
  });

  it('skips a reference with nothing in it', () => {
    expect(findReferenceTokens('{{ }}')).toEqual([]);
  });
});

describe('what the filter check sees', () => {
  it('ignores a pipe inside a quoted string, as the type lookup always did', () => {
    expect(lookupReferenceTypeLabel(catalog, 'a == "x|y"')).toBe('boolean');
  });

  it('agrees with that lookup when asked whether a reference is one value (NEW)', () => {
    expect(isSingleValueReference('a == "x|y"', 'boolean')).toBe(true);
    expect(isSingleValueReference('consts.name | upcase', 'string')).toBe(false);
    expect(isSingleValueReference('consts.name', 'string')).toBe(true);
  });
});

describe('validation that looks for references', () => {
  const jsonLiquid: StepFormField = {
    key: 'body',
    path: ['with', 'body'],
    label: 'Body',
    required: false,
    kind: 'code',
    language: 'json-liquid',
  };
  const duration: StepFormField = {
    key: 'timeout',
    path: ['timeout'],
    label: 'Duration',
    required: false,
    kind: 'text',
    format: 'duration',
  };

  it('accepts JSON whose Liquid holds a quoted `}}` (NEW)', () => {
    expect(validateStepField(jsonLiquid, '{"a": {{ x | default: "}}" }} }')).toBeUndefined();
  });

  it('still accepts JSON with a reference where a value goes', () => {
    expect(
      validateStepField(jsonLiquid, '{"a": {{ x }}, "b": "{{ y }}", "c": ${{ z }}}')
    ).toBeUndefined();
  });

  it('still rejects JSON that is broken apart from its references', () => {
    expect(validateStepField(jsonLiquid, '{"a": {{ x }}')).toEqual(
      'Must be valid JSON (ignoring variables)'
    );
  });

  it('accepts a duration, or a template that renders to one', () => {
    expect(validateStepField(duration, '30s')).toBeUndefined();
    expect(validateStepField(duration, '{{ steps.a.output }}')).toBeUndefined();
    expect(validateStepField(duration, '{{ x | default: "}}" }}')).toBeUndefined();
  });

  it('still rejects text that is neither', () => {
    expect(validateStepField(duration, 'soon')).toEqual(expect.any(String));
  });
});
