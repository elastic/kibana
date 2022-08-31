/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewFieldBase } from '@kbn/es-query';
import { ReactElement } from 'react';
import { act } from '@testing-library/react';

import { renderHook } from '@testing-library/react-hooks';
import TestRenderer from 'react-test-renderer';
const { act: actTestRenderer } = TestRenderer;

import { fields } from '../../fields/index.mock';
import { useField } from '../use_field';

jest.mock('../../translations', () => ({
  BINARY_TYPE_NOT_SUPPORTED: 'Binary fields are currently unsupported',
}));

const indexPattern = { fields, title: 'title' };
const onChangeMock = jest.fn();
const selectedField = { name: '@timestamp', type: 'date' };
describe('useField', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
  });

  describe('comboOptions and selectedComboOptions', () => {
    it('should return default values', () => {
      const { result } = renderHook(() => useField({ indexPattern, onChange: onChangeMock }));
      const { isInvalid, comboOptions, selectedComboOptions, fieldWidth } = result.current;
      expect(isInvalid).toBeFalsy();
      expect(comboOptions.length).toEqual(30);
      expect(selectedComboOptions.length).toEqual(0);
      expect(fieldWidth).toEqual({});
    });
    it('should map fields to comboOptions correctly and return empty selectedComboOptions', () => {
      const newIndexPattern = {
        ...indexPattern,
        fields: [
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
        ] as unknown as DataViewFieldBase[],
        title: 'title1',
      };

      const { result } = renderHook(() =>
        useField({ indexPattern: newIndexPattern, onChange: onChangeMock })
      );
      const { comboOptions, selectedComboOptions } = result.current;
      expect(comboOptions).toEqual([{ label: 'bytes' }, { label: 'ssl' }, { label: '@timestamp' }]);
      expect(selectedComboOptions).toEqual([]);
    });
    it('should map fields to comboOptions correctly and return selectedComboOptions', () => {
      const newIndexPattern = {
        ...indexPattern,
        fields: [
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
        ] as unknown as DataViewFieldBase[],
        title: 'title1',
      };

      const { result } = renderHook(() =>
        useField({ indexPattern: newIndexPattern, onChange: onChangeMock, selectedField })
      );
      const { comboOptions, selectedComboOptions } = result.current;
      expect(comboOptions).toEqual([{ label: 'bytes' }, { label: 'ssl' }, { label: '@timestamp' }]);
      expect(selectedComboOptions).toEqual([{ label: '@timestamp' }]);
    });
  });

  describe('getDisabledLabelTooltipTexts and renderFields', () => {
    it('should return label as component and disable the binary field type if field.esType has one the disabled types', () => {
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
        expect(label?.props.content).toEqual('Binary fields are currently unsupported');
      });
    });
    it('should return label as component and disable the binary field type if field.type is one of the disabled types', () => {
      indexPattern.fields = [
        {
          name: 'blob',
          type: 'binary',
          esTypes: [],
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
        expect(label?.props.content).toEqual('Binary fields are currently unsupported');
      });
    });
    it('should return label as string', () => {
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
      const { comboOptions, renderFields } = result.current;
      expect(comboOptions).toEqual([{ label: 'bytes' }, { label: 'ssl' }, { label: '@timestamp' }]);
      act(() => {
        const label = renderFields({ label: '@timestamp' }, '', '') as ReactElement;
        expect(label).toEqual('@timestamp');
      });
    });
  });
  describe('handleValuesChange', () => {
    beforeEach(() => {
      jest.resetAllMocks();
      jest.resetModules();
    });
    it('should invoke onChange with one value if one option is sent', () => {
      const { result } = renderHook(() => useField({ indexPattern, onChange: onChangeMock }));
      act(() => {
        result.current.handleValuesChange([
          {
            label: '@timestamp',
          },
        ]);
        expect(onChangeMock).toHaveBeenCalledWith([
          {
            aggregatable: true,
            count: 30,
            esTypes: ['date'],
            name: '@timestamp',
            readFromDocValues: true,
            scripted: false,
            searchable: true,
            type: 'date',
          },
        ]);
      });
    });
    it('should invoke onChange with array value if more than an option', () => {
      const { result } = renderHook(() => useField({ indexPattern, onChange: onChangeMock }));
      act(() => {
        result.current.handleValuesChange([
          {
            label: '@timestamp',
          },
          {
            label: 'ssl',
          },
        ]);
        expect(onChangeMock).toHaveBeenCalledWith([
          {
            aggregatable: true,
            count: 30,
            esTypes: ['date'],
            name: '@timestamp',
            readFromDocValues: true,
            scripted: false,
            searchable: true,
            type: 'date',
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
        ]);
      });
    });
  });

  describe('fieldWidth', () => {
    it('should return object has width prop', () => {
      const { result } = renderHook(() =>
        useField({ indexPattern, onChange: onChangeMock, fieldInputWidth: 100 })
      );
      expect(result.current.fieldWidth).toEqual({ width: '100px' });
    });
    it('should return empty object', () => {
      const { result } = renderHook(() =>
        useField({ indexPattern, onChange: onChangeMock, fieldInputWidth: 0 })
      );
      expect(result.current.fieldWidth).toEqual({});
    });
  });

  describe('isInvalid with handleTouch', () => {
    it('should return isInvalid equals true when calling with no selectedField and isRequired is true', () => {
      const { result } = renderHook(() =>
        useField({ indexPattern, onChange: onChangeMock, isRequired: true })
      );

      actTestRenderer(() => {
        result.current.handleTouch();
      });
      expect(result.current.isInvalid).toBeTruthy();
    });
    it('should return isInvalid equals false with selectedField and isRequired is true', () => {
      const { result } = renderHook(() =>
        useField({ indexPattern, onChange: onChangeMock, isRequired: true, selectedField })
      );

      actTestRenderer(() => {
        result.current.handleTouch();
      });
      expect(result.current.isInvalid).toBeFalsy();
    });
    it('should return isInvalid equals false when isRequired is false', () => {
      const { result } = renderHook(() => useField({ indexPattern, onChange: onChangeMock }));

      actTestRenderer(() => {
        result.current.handleTouch();
      });
      expect(result.current.isInvalid).toBeFalsy();
    });
  });
});
