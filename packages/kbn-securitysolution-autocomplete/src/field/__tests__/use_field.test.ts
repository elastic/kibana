/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewFieldBase } from '@kbn/es-query';
import { act } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import { ReactElement } from 'react';

import { fields } from '../../fields/index.mock';
import { useField } from '../use_field';

jest.mock('../../translations', () => ({
  BINARY_TYPE_NOT_SUPPORTED: 'Binary field is unsupported at the moment',
}));

const indexPattern = { fields, title: 'title' };
const onChangeMock = jest.fn();
const selectedField = { name: '@timestamp', type: 'date' };
describe('useField', () => {
  it('should return default values', () => {
    const { result } = renderHook(() => useField({ indexPattern, onChange: onChangeMock }));
    const { isInvalid, comboOptions, selectedComboOptions, fieldWidth } = result.current;
    expect(isInvalid).toBeFalsy();
    expect(comboOptions.length).toEqual(30);
    expect(selectedComboOptions.length).toEqual(0);
    expect(fieldWidth).toEqual({});
  });
  it('should map fields to comboOptions correctly and return empty selectedComboOptions', () => {
    indexPattern.fields = [
      {
        name: 'bytes',
        type: 'number',
        esTypes: ['long'],
        count: 10,
        scripted: false,
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
      },
      {
        name: 'ssl',
        type: 'boolean',
        esTypes: ['boolean'],
        count: 20,
        scripted: false,
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
      },
      {
        name: '@timestamp',
        type: 'date',
        esTypes: ['date'],
        count: 30,
        scripted: false,
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
      },
    ] as unknown as DataViewFieldBase[];
    const { result } = renderHook(() => useField({ indexPattern, onChange: onChangeMock }));
    const { comboOptions, selectedComboOptions } = result.current;
    expect(comboOptions).toEqual([{ label: 'bytes' }, { label: 'ssl' }, { label: '@timestamp' }]);
    expect(selectedComboOptions).toEqual([]);
  });
  it('should map fields to comboOptions correctly and return selectedComboOptions', () => {
    indexPattern.fields = [
      {
        name: 'bytes',
        type: 'number',
        esTypes: ['long'],
        count: 10,
        scripted: false,
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
      },
      {
        name: 'ssl',
        type: 'boolean',
        esTypes: ['boolean'],
        count: 20,
        scripted: false,
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
      },
      {
        name: '@timestamp',
        type: 'date',
        esTypes: ['date'],
        count: 30,
        scripted: false,
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
      },
    ] as unknown as DataViewFieldBase[];
    const { result } = renderHook(() =>
      useField({ indexPattern, onChange: onChangeMock, selectedField })
    );
    const { comboOptions, selectedComboOptions } = result.current;
    expect(comboOptions).toEqual([{ label: 'bytes' }, { label: 'ssl' }, { label: '@timestamp' }]);
    expect(selectedComboOptions).toEqual([{ label: '@timestamp' }]);
  });
  it('should map fields to comboOptions correctly and disable the binary field type', () => {
    indexPattern.fields = [
      {
        name: 'blob',
        type: 'unknown',
        esTypes: ['binary'],
        scripted: false,
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
      },
      {
        name: 'bytes',
        type: 'number',
        esTypes: ['long'],
        count: 10,
        scripted: false,
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
      },
      {
        name: 'ssl',
        type: 'boolean',
        esTypes: ['boolean'],
        count: 20,
        scripted: false,
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
      },
      {
        name: '@timestamp',
        type: 'date',
        esTypes: ['date'],
        count: 30,
        scripted: false,
        searchable: true,
        aggregatable: true,
        readFromDocValues: true,
      },
    ] as unknown as DataViewFieldBase[];
    const { result } = renderHook(() => useField({ indexPattern, onChange: onChangeMock }));
    const { comboOptions, renderFields } = result.current;
    expect(comboOptions).toEqual([
      { label: 'blob' },
      { label: 'bytes' },
      { label: 'ssl' },
      { label: '@timestamp' },
    ]);
    act(() => {
      const label = renderFields({ label: 'blob' }, '', '') as ReactElement;
      expect(label?.props.content).toEqual('Binary field is unsupported at the moment');
    });
  });
});
