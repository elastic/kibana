/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataReferenceCatalog, DataReferenceItem } from './build_data_reference_catalog';
import { lookupReferenceTypeLabel, parseWholeReference, toValueFormToken } from './reference_value';

describe('parseWholeReference', () => {
  it('parses a whole text-form and value-form reference', () => {
    expect(parseWholeReference('{{ steps.a.output.hits }}')).toEqual({
      form: 'text',
      expression: 'steps.a.output.hits',
    });
    expect(parseWholeReference('${{ steps.a.output.hits | json }}')).toEqual({
      form: 'value',
      expression: 'steps.a.output.hits | json',
    });
  });

  it('rejects sentences, several spans, Liquid tags and non-strings', () => {
    expect(parseWholeReference('Found {{ a }} alerts')).toBeUndefined();
    expect(parseWholeReference('{{ a }} and {{ b }}')).toBeUndefined();
    expect(parseWholeReference('{% if a %}x{% endif %}')).toBeUndefined();
    expect(parseWholeReference(3)).toBeUndefined();
    expect(parseWholeReference(undefined)).toBeUndefined();
  });
});

describe('toValueFormToken', () => {
  it('rewrites a whole text-form token and leaves anything else alone', () => {
    expect(toValueFormToken('{{ steps.a.output }}')).toBe('${{ steps.a.output }}');
    expect(toValueFormToken('already ${{ x }} here')).toBe('already ${{ x }} here');
  });
});

describe('lookupReferenceTypeLabel', () => {
  const item = (overrides: Partial<DataReferenceItem>): DataReferenceItem => ({
    path: 'p',
    label: 'p',
    typeLabel: 'string',
    drillable: false,
    originLabel: 'test',
    ...overrides,
  });
  const catalog: DataReferenceCatalog = {
    groups: [
      {
        id: 'steps',
        label: 'Steps',
        description: '',
        emptyMessage: '',
        items: [
          item({
            path: 'steps.a.output',
            label: 'a',
            typeLabel: 'object',
            isEntity: true,
            drillable: true,
            children: [item({ path: 'steps.a.output', label: 'output', typeLabel: 'unknown' })],
          }),
          item({ path: 'steps.b.output.hits', typeLabel: 'array' }),
        ],
      },
    ],
  } as unknown as DataReferenceCatalog;

  it('prefers the leaf over the step entity that shares its path', () => {
    expect(lookupReferenceTypeLabel(catalog, 'steps.a.output')).toBe('unknown');
  });

  it('ignores filters and returns undefined for unknown paths', () => {
    expect(lookupReferenceTypeLabel(catalog, 'steps.b.output.hits | json')).toBe('array');
    expect(lookupReferenceTypeLabel(catalog, 'inputs.nope')).toBeUndefined();
  });
});
