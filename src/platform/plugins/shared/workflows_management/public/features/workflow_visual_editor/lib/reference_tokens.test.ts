/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataReferenceCatalog, DataReferenceItem } from './build_data_reference_catalog';
import { findReferenceTokens, insertTokenAsJsonText } from './reference_tokens';

const item = (overrides: Partial<DataReferenceItem>): DataReferenceItem => ({
  path: 'p',
  label: 'p',
  typeLabel: 'string',
  drillable: false,
  originLabel: 'test',
  ...overrides,
});

const catalog = {
  groups: [
    {
      id: 'context',
      label: 'Context',
      description: '',
      emptyMessage: '',
      items: [
        item({ path: 'consts.name', typeLabel: 'string' }),
        item({ path: 'consts.tags', typeLabel: 'array' }),
        item({ path: 'consts.count', typeLabel: 'number' }),
      ],
    },
  ],
} as unknown as DataReferenceCatalog;

describe('findReferenceTokens', () => {
  it('finds text-form and value-form spans with their offsets and delimiters', () => {
    const text = 'a {{ consts.name }} b ${{ consts.count }}';
    const [first, second] = findReferenceTokens(text, { catalog });
    expect(text.slice(first.start, first.end)).toBe('{{ consts.name }}');
    expect(first).toMatchObject({ form: 'text', openLength: 2, expression: 'consts.name' });
    expect(text.slice(second.start, second.end)).toBe('${{ consts.count }}');
    expect(second).toMatchObject({ form: 'value', openLength: 3, expression: 'consts.count' });
  });

  it('takes the type and icon from the catalog, and falls back to unknown', () => {
    const [known, unknown] = findReferenceTokens('{{ consts.name }} {{ inputs.x }}', { catalog });
    expect(known).toMatchObject({ typeLabel: 'string', iconType: 'string', tone: 'neutral' });
    expect(unknown).toMatchObject({ typeLabel: undefined, iconType: 'unknown', tone: 'neutral' });
  });

  it('types a comparison as boolean and a filtered value as unknown', () => {
    const [comparison] = findReferenceTokens('${{ inputs.nope != blank }}', { catalog });
    expect(comparison).toMatchObject({ typeLabel: 'boolean', iconType: 'boolean' });
    const [filtered] = findReferenceTokens('{{ consts.tags | json }}', { catalog });
    expect(filtered).toMatchObject({ typeLabel: undefined, iconType: 'unknown' });
  });

  it('ignores Liquid tags, empty spans and unclosed braces', () => {
    expect(findReferenceTokens('{% if a %}x{% endif %} {{ }} {{ open', { catalog })).toEqual([]);
  });

  it('flags a known list inside a sentence only when asked, and never for the whole value', () => {
    const inSentence = 'Tags: {{ consts.tags }}';
    expect(findReferenceTokens(inSentence, { catalog })[0].tone).toBe('neutral');
    const [flagged] = findReferenceTokens(inSentence, { catalog, warnContainersInSentence: true });
    expect(flagged).toMatchObject({ tone: 'warning', isContainerInSentence: true });
    const [whole] = findReferenceTokens('{{ consts.tags }}', {
      catalog,
      warnContainersInSentence: true,
    });
    expect(whole).toMatchObject({ tone: 'neutral', isWhole: true });
  });

  it('does not flag a list that already goes through a filter', () => {
    const [token] = findReferenceTokens('Tags: {{ consts.tags | join: ", " }}', {
      catalog,
      warnContainersInSentence: true,
    });
    expect(token.tone).toBe('neutral');
  });

  it('flags the value form when it is not the whole value', () => {
    const [token] = findReferenceTokens('x ${{ consts.count }}', { catalog });
    expect(token).toMatchObject({ tone: 'warning', isWhole: false });
  });
});

describe('insertTokenAsJsonText', () => {
  it('rewrites only the chosen token with the json filter', () => {
    const text = 'A {{ consts.tags }} and {{ consts.name }}';
    const [tags] = findReferenceTokens(text, { catalog });
    expect(insertTokenAsJsonText(text, tags)).toBe(
      'A {{ consts.tags | json }} and {{ consts.name }}'
    );
  });
});
