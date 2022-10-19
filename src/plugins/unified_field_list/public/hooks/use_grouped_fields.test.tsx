/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { type GroupedFieldsParams, useGroupedFields } from './use_grouped_fields';
import { ExistenceFetchStatus, FieldsGroupNames } from '../types';

describe('UnifiedFieldList useGroupedFields()', () => {
  let mockedServices: GroupedFieldsParams<DataViewField>['services'];
  const allFields = dataView.fields;

  beforeEach(() => {
    const dataViews = dataViewPluginMocks.createStartContract();
    mockedServices = {
      dataViews,
    };

    dataViews.get.mockImplementation(async (id: string) => {
      return dataView;
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
      'AvailableFields-28',
      'EmptyFields-0',
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

  it('should work correctly when existence info is available', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useGroupedFields({
        dataViewId: dataView.id!,
        allFields,
        services: mockedServices,
        fieldsExistenceReader: {
          hasFieldData: (dataViewId, fieldName) => {
            return dataViewId === dataView.id! && ['bytes', 'extension'].includes(fieldName);
          },
          getFieldsExistenceStatus: () => ExistenceFetchStatus.succeeded,
          isFieldsExistenceInfoUnavailable: () => false,
        },
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
      'AvailableFields-2',
      'EmptyFields-23',
      'MetaFields-3',
    ]);
  });
});
