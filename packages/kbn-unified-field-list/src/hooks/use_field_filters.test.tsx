/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';
import { act } from 'react-test-renderer';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { coreMock } from '@kbn/core/public/mocks';
import { useFieldFilters, type FieldFiltersParams } from './use_field_filters';

describe('UnifiedFieldList useFieldFilters()', () => {
  let mockedServices: FieldFiltersParams<DataViewField>['services'];

  beforeEach(() => {
    const core = coreMock.createStart();
    mockedServices = {
      core,
    };
  });

  it('should work correctly for no filters', async () => {
    const props: FieldFiltersParams<DataViewField> = {
      allFields: dataView.fields,
      services: mockedServices,
    };
    const { result } = renderHook(useFieldFilters, {
      initialProps: props,
    });

    expect(result.current.fieldSearchHighlight).toBe('');
    expect(result.current.onFilterField).toBeUndefined();
    expect(result.current.fieldListFiltersProps.getCustomFieldType).toBeUndefined();
    expect(result.current.fieldListFiltersProps).toStrictEqual(
      expect.objectContaining({
        docLinks: mockedServices.core.docLinks,
        allFields: props.allFields,
        nameFilter: '',
        selectedFieldTypes: [],
      })
    );
  });

  it('should update correctly on search by name', async () => {
    const props: FieldFiltersParams<DataViewField> = {
      allFields: dataView.fields,
      services: mockedServices,
    };
    const { result } = renderHook(useFieldFilters, {
      initialProps: props,
    });

    expect(result.current.fieldSearchHighlight).toBe('');
    expect(result.current.onFilterField).toBeUndefined();

    act(() => {
      result.current.fieldListFiltersProps.onChangeNameFilter('Time ');
    });

    expect(result.current.fieldSearchHighlight).toBe('time');
    expect(result.current.onFilterField).toBeDefined();
    expect(result.current.onFilterField!({ displayName: 'time test' } as DataViewField)).toBe(true);
    expect(result.current.onFilterField!(dataView.getFieldByName('@timestamp')!)).toBe(true);
    expect(result.current.onFilterField!(dataView.getFieldByName('bytes')!)).toBe(false);
  });

  it('should update correctly on search by name which has a wildcard', async () => {
    const props: FieldFiltersParams<DataViewField> = {
      allFields: dataView.fields,
      services: mockedServices,
    };
    const { result } = renderHook(useFieldFilters, {
      initialProps: props,
    });

    expect(result.current.fieldSearchHighlight).toBe('');
    expect(result.current.onFilterField).toBeUndefined();

    act(() => {
      result.current.fieldListFiltersProps.onChangeNameFilter('message*me1');
    });

    expect(result.current.fieldSearchHighlight).toBe('message*me1');
    expect(result.current.onFilterField).toBeDefined();
    expect(result.current.onFilterField!({ displayName: 'test' } as DataViewField)).toBe(false);
    expect(result.current.onFilterField!({ displayName: 'message' } as DataViewField)).toBe(false);
    expect(result.current.onFilterField!({ displayName: 'message.name1' } as DataViewField)).toBe(
      true
    );
    expect(result.current.onFilterField!({ name: 'messagename10' } as DataViewField)).toBe(false);
    expect(result.current.onFilterField!({ name: 'message.test' } as DataViewField)).toBe(false);
  });

  it('should update correctly on filter by type', async () => {
    const props: FieldFiltersParams<DataViewField> = {
      allFields: dataView.fields,
      services: mockedServices,
    };
    const { result } = renderHook(useFieldFilters, {
      initialProps: props,
    });

    expect(result.current.onFilterField).toBeUndefined();

    act(() => {
      result.current.fieldListFiltersProps.onChangeFieldTypes(['number']);
    });

    expect(result.current.onFilterField).toBeDefined();
    expect(result.current.onFilterField!(dataView.getFieldByName('@timestamp')!)).toBe(false);
    expect(result.current.onFilterField!(dataView.getFieldByName('bytes')!)).toBe(true);
  });

  it('should update correctly on filter by custom field type', async () => {
    const props: FieldFiltersParams<DataViewField> = {
      allFields: dataView.fields,
      services: mockedServices,
      getCustomFieldType: (field) => field.name,
    };
    const { result } = renderHook(useFieldFilters, {
      initialProps: props,
    });

    expect(result.current.onFilterField).toBeUndefined();
    expect(result.current.fieldListFiltersProps.getCustomFieldType).toBe(props.getCustomFieldType);

    act(() => {
      result.current.fieldListFiltersProps.onChangeFieldTypes(['bytes', '@timestamp']);
    });

    expect(result.current.onFilterField).toBeDefined();
    expect(result.current.onFilterField!(dataView.getFieldByName('@timestamp')!)).toBe(true);
    expect(result.current.onFilterField!(dataView.getFieldByName('bytes')!)).toBe(true);
    expect(result.current.onFilterField!(dataView.getFieldByName('extension')!)).toBe(false);
  });
});
