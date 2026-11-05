/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataReferenceCatalog, DataReferenceItem } from './build_data_reference_catalog';
import {
  isContainerReference,
  lookupReferenceTypeLabel,
  normalizeReferenceForm,
  parseWholeReference,
  toValueFormToken,
} from './reference_value';

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

  it('returns undefined for paths the catalog does not know', () => {
    expect(lookupReferenceTypeLabel(catalog, 'inputs.nope')).toBeUndefined();
  });

  it('says unknown once a filter reshapes the value, instead of the type before the filter', () => {
    // `hits` is a list, but `| json` makes it a string and `| size` a number.
    expect(lookupReferenceTypeLabel(catalog, 'steps.b.output.hits')).toBe('array');
    expect(lookupReferenceTypeLabel(catalog, 'steps.b.output.hits | json')).toBeUndefined();
    expect(lookupReferenceTypeLabel(catalog, 'steps.b.output.hits | size')).toBeUndefined();
  });

  it('types a comparison or a logical combination as boolean, whatever its operands are', () => {
    [
      'inputs.nope != blank',
      'inputs.nope == 5',
      'steps.b.output.hits >= 3',
      'steps.b.output.hits < 3',
      'steps.b.output.hits contains 2',
      'inputs.a != blank and inputs.b != blank',
      'inputs.a == blank or inputs.b == blank',
    ].forEach((expression) => {
      expect(lookupReferenceTypeLabel(catalog, expression)).toBe('boolean');
    });
  });

  it('ignores operators and pipes inside quoted text', () => {
    // A plain path whose quoted key happens to contain an operator is still just a path.
    expect(lookupReferenceTypeLabel(catalog, "inputs['a == b']")).toBeUndefined();
    expect(lookupReferenceTypeLabel(catalog, "steps.b.output.hits['x | y']")).toBeUndefined();
    // A comparison against a quoted string is still a comparison.
    expect(lookupReferenceTypeLabel(catalog, "inputs.nope == 'a | b'")).toBe('boolean');
  });

  it('does not mistake a name that contains and/or for an operator', () => {
    expect(lookupReferenceTypeLabel(catalog, 'inputs.order')).toBeUndefined();
    expect(lookupReferenceTypeLabel(catalog, 'inputs.android')).toBeUndefined();
  });
});

describe('normalizeReferenceForm', () => {
  it('keeps a whole reference typed: text form becomes value form', () => {
    expect(normalizeReferenceForm('{{ steps.a.output.hits }}')).toBe('${{ steps.a.output.hits }}');
    expect(normalizeReferenceForm('${{ steps.a.output.hits }}')).toBe('${{ steps.a.output.hits }}');
  });

  it('writes references inside a sentence as text, including several value forms', () => {
    expect(normalizeReferenceForm('Found ${{ steps.a.output.total }} alerts')).toBe(
      'Found {{ steps.a.output.total }} alerts'
    );
    expect(normalizeReferenceForm('${{ a }} ${{ b }}')).toBe('{{ a }} {{ b }}');
  });

  it('leaves plain text alone', () => {
    expect(normalizeReferenceForm('escalated')).toBe('escalated');
    expect(normalizeReferenceForm('')).toBe('');
  });
});

describe('isContainerReference', () => {
  it('is true for a known list or record, unless a filter already reshapes it', () => {
    expect(isContainerReference('consts.tags', 'array')).toBe(true);
    expect(isContainerReference('consts.doc', 'object')).toBe(true);
    expect(isContainerReference('consts.tags | json', 'array')).toBe(false);
  });

  it('is false for text, numbers and anything the catalog does not know', () => {
    expect(isContainerReference('consts.name', 'string')).toBe(false);
    expect(isContainerReference('consts.count', 'number')).toBe(false);
    expect(isContainerReference('inputs.x')).toBe(false);
  });
});
