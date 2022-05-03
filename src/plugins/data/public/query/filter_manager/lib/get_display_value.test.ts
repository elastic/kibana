/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { DataView } from '@kbn/data-views-plugin/public';
import { FilterStateStore, PhraseFilter } from '@kbn/es-query';
import { stubIndexPattern, phraseFilter } from '../../../../common/stubs';
import { getDisplayValueFromFilter, getFieldDisplayValueFromFilter } from './get_display_value';
import { FieldFormat } from '@kbn/field-formats-plugin/common';

describe('getDisplayValueFromFilter', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns the value if string', () => {
    phraseFilter.meta.value = 'abc';
    const displayValue = getDisplayValueFromFilter(phraseFilter, [stubIndexPattern]);
    expect(displayValue).toBe('abc');
  });

  it('returns the value if undefined', () => {
    phraseFilter.meta.value = undefined;
    const displayValue = getDisplayValueFromFilter(phraseFilter, [stubIndexPattern]);
    expect(displayValue).toBe('');
  });

  it('calls the value function if provided', () => {
    // The type of value currently doesn't match how it's used. Refactor needed.
    phraseFilter.meta.value = jest.fn((x) => {
      return 'abc';
    }) as any;
    jest.spyOn(stubIndexPattern, 'getFormatterForField').mockImplementation(() => undefined!);
    const displayValue = getDisplayValueFromFilter(phraseFilter, [stubIndexPattern]);
    expect(displayValue).toBe('abc');
    expect(phraseFilter.meta.value).toHaveBeenCalledWith(undefined);
  });

  it('calls the value function if provided, with formatter', () => {
    const mockFormatter = new (FieldFormat.from((value: string) => 'banana' + value))();
    jest.spyOn(stubIndexPattern, 'getFormatterForField').mockImplementation(() => mockFormatter);
    phraseFilter.meta.value = jest.fn((x) => {
      return x.convert('abc');
    }) as any;
    const displayValue = getDisplayValueFromFilter(phraseFilter, [stubIndexPattern]);
    expect(stubIndexPattern.getFormatterForField).toHaveBeenCalledTimes(1);
    expect(phraseFilter.meta.value).toHaveBeenCalledWith(mockFormatter);
    expect(displayValue).toBe('bananaabc');
  });
});

describe('getFieldDisplayValueFromFilter', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns empty string if the index pattern is not found', () => {
    const wrongIndexPattern = {
      title: 'wrong index pattern',
      id: 'wrong index pattern',
    } as DataView;
    const fieldLabel = getFieldDisplayValueFromFilter(phraseFilter, [wrongIndexPattern]);
    expect(fieldLabel).toBe('');
  });

  it('returns empty string if custom label is not set', () => {
    const filter: PhraseFilter = {
      meta: {
        negate: false,
        index: 'logstash-*',
        type: 'phrase',
        key: 'bytes',
        value: '1024',
        disabled: false,
        alias: null,
      },
      $state: {
        store: FilterStateStore.APP_STATE,
      },
      query: {},
    };
    const fieldLabel = getFieldDisplayValueFromFilter(filter, [stubIndexPattern]);
    expect(fieldLabel).toBe('');
  });

  it('returns the field custom label if it set', () => {
    const fieldLabel = getFieldDisplayValueFromFilter(phraseFilter, [stubIndexPattern]);
    expect(fieldLabel).toBe('OS');
  });
});
