/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';
import {
  stubDataViewWithoutTimeField,
  stubLogstashDataView as dataView,
} from '@kbn/data-views-plugin/common/data_view.stub';
import { createStubDataView, stubFieldSpecMap } from '@kbn/data-plugin/public/stubs';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { type GroupedFieldsParams, useGroupedFields } from './use_grouped_fields';
import { ExistenceFetchStatus, FieldListGroups, FieldsGroupNames } from '../types';

describe('UnifiedFieldList useGroupedFields()', () => {
  let mockedServices: GroupedFieldsParams<DataViewField>['services'];
  const allFields = dataView.fields;
  const anotherDataView = createStubDataView({
    spec: {
      id: 'another-data-view',
      title: 'logstash-0',
      fields: stubFieldSpecMap,
    },
  });

  beforeEach(() => {
    const dataViews = dataViewPluginMocks.createStartContract();
    mockedServices = {
      dataViews,
    };

    dataViews.get.mockImplementation(async (id: string) => {
      return [dataView, stubDataViewWithoutTimeField].find((dw) => dw.id === id)!;
    });
  });

  it('should work correctly for no data', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useGroupedFields({
        dataViewId: dataView.id!,
        allFields: [],
        services: mockedServices,
      })
    );

    await waitForNextUpdate();

    const fieldGroups = result.current.fieldGroups;

    expect(
      Object.keys(fieldGroups!).map(
        (key) => `${key}-${fieldGroups![key as FieldsGroupNames]?.fields.length}`
      )
    ).toStrictEqual([
      'SpecialFields-0',
      'SelectedFields-0',
      'PopularFields-0',
      'AvailableFields-0',
      'EmptyFields-0',
      'MetaFields-0',
    ]);
  });

  it('should work correctly with fields', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useGroupedFields({
        dataViewId: dataView.id!,
        allFields,
        services: mockedServices,
      })
    );

    await waitForNextUpdate();

    const fieldGroups = result.current.fieldGroups;

    expect(
      Object.keys(fieldGroups!).map(
        (key) => `${key}-${fieldGroups![key as FieldsGroupNames]?.fields.length}`
      )
    ).toStrictEqual([
      'SpecialFields-0',
      'SelectedFields-0',
      'PopularFields-0',
      'AvailableFields-25',
      'EmptyFields-0',
      'MetaFields-3',
    ]);
  });

  it('should work correctly when filtered', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useGroupedFields({
        dataViewId: dataView.id!,
        allFields,
        services: mockedServices,
        onFilterField: (field: DataViewField) => field.name.startsWith('@'),
      })
    );

    await waitForNextUpdate();

    const fieldGroups = result.current.fieldGroups;

    expect(
      Object.keys(fieldGroups!).map(
        (key) => `${key}-${fieldGroups![key as FieldsGroupNames]?.fields.length}`
      )
    ).toStrictEqual([
      'SpecialFields-0',
      'SelectedFields-0',
      'PopularFields-0',
      'AvailableFields-2',
      'EmptyFields-0',
      'MetaFields-0',
    ]);
  });

  it('should work correctly when custom unsupported fields are skipped', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useGroupedFields({
        dataViewId: dataView.id!,
        allFields,
        services: mockedServices,
        onSupportedFieldFilter: (field: DataViewField) => field.aggregatable,
      })
    );

    await waitForNextUpdate();

    const fieldGroups = result.current.fieldGroups;

    expect(
      Object.keys(fieldGroups!).map(
        (key) => `${key}-${fieldGroups![key as FieldsGroupNames]?.fields.length}`
      )
    ).toStrictEqual([
      'SpecialFields-0',
      'SelectedFields-0',
      'PopularFields-0',
      'AvailableFields-23',
      'EmptyFields-0',
      'MetaFields-3',
    ]);
  });

  it('should work correctly when selected fields are present', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useGroupedFields({
        dataViewId: dataView.id!,
        allFields,
        services: mockedServices,
        onSelectedFieldFilter: (field: DataViewField) =>
          ['bytes', 'extension', '_id', '@timestamp'].includes(field.name),
      })
    );

    await waitForNextUpdate();

    const fieldGroups = result.current.fieldGroups;

    expect(
      Object.keys(fieldGroups!).map(
        (key) => `${key}-${fieldGroups![key as FieldsGroupNames]?.fields.length}`
      )
    ).toStrictEqual([
      'SpecialFields-0',
      'SelectedFields-4',
      'PopularFields-0',
      'AvailableFields-25',
      'EmptyFields-0',
      'MetaFields-3',
    ]);
  });

  it('should work correctly for text-based queries (no data view)', async () => {
    const { result } = renderHook(() =>
      useGroupedFields({
        dataViewId: null,
        allFields,
        services: mockedServices,
      })
    );

    const fieldGroups = result.current.fieldGroups;

    expect(
      Object.keys(fieldGroups!).map(
        (key) => `${key}-${fieldGroups![key as FieldsGroupNames]?.fields.length}`
      )
    ).toStrictEqual([
      'SpecialFields-0',
      'SelectedFields-0',
      'PopularFields-0',
      'AvailableFields-28',
      'MetaFields-0',
    ]);
  });

  it('should work correctly when details are overwritten', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useGroupedFields({
        dataViewId: dataView.id!,
        allFields,
        services: mockedServices,
        onOverrideFieldGroupDetails: (groupName) => {
          if (groupName === FieldsGroupNames.SelectedFields) {
            return {
              helpText: 'test',
            };
          }
        },
      })
    );

    await waitForNextUpdate();

    const fieldGroups = result.current.fieldGroups;

    expect(fieldGroups[FieldsGroupNames.SelectedFields]?.helpText).toBe('test');
    expect(fieldGroups[FieldsGroupNames.AvailableFields]?.helpText).not.toBe('test');
  });

  it('should work correctly when changing a data view and existence info is available only for one of them', async () => {
    const knownDataViewId = dataView.id!;
    let fieldGroups: FieldListGroups<DataViewField>;
    const props: GroupedFieldsParams<DataViewField> = {
      dataViewId: dataView.id!,
      allFields,
      services: mockedServices,
      fieldsExistenceReader: {
        hasFieldData: (dataViewId, fieldName) => {
          return dataViewId === knownDataViewId && ['bytes', 'extension'].includes(fieldName);
        },
        getFieldsExistenceStatus: (dataViewId) =>
          dataViewId === knownDataViewId
            ? ExistenceFetchStatus.succeeded
            : ExistenceFetchStatus.unknown,
        isFieldsExistenceInfoUnavailable: (dataViewId) => dataViewId !== knownDataViewId,
      },
    };

    const { result, waitForNextUpdate, rerender } = renderHook(useGroupedFields, {
      initialProps: props,
    });
    await waitForNextUpdate();

    fieldGroups = result.current.fieldGroups;

    expect(
      Object.keys(fieldGroups!).map(
        (key) => `${key}-${fieldGroups![key as FieldsGroupNames]?.fields.length}`
      )
    ).toStrictEqual([
      'SpecialFields-0',
      'SelectedFields-0',
      'PopularFields-0',
      'AvailableFields-2',
      'EmptyFields-23',
      'MetaFields-3',
    ]);

    rerender({
      ...props,
      dataViewId: anotherDataView.id!,
      allFields: anotherDataView.fields,
    });

    await waitForNextUpdate();

    fieldGroups = result.current.fieldGroups;

    expect(
      Object.keys(fieldGroups!).map(
        (key) => `${key}-${fieldGroups![key as FieldsGroupNames]?.fields.length}`
      )
    ).toStrictEqual([
      'SpecialFields-0',
      'SelectedFields-0',
      'PopularFields-0',
      'AvailableFields-8',
      'MetaFields-0',
    ]);
  });

  // TODO: add a test for popular fields
});
