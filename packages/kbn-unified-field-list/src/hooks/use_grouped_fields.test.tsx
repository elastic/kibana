/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react-hooks';
import {
  stubDataViewWithoutTimeField,
  stubLogstashDataView as dataView,
} from '@kbn/data-views-plugin/common/data_view.stub';
import { createStubDataView, stubFieldSpecMap } from '@kbn/data-plugin/public/stubs';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { type GroupedFieldsParams, useGroupedFields } from './use_grouped_fields';
import * as ExistenceApi from './use_existing_fields';
import { type ExistingFieldsReader } from './use_existing_fields';
import { ExistenceFetchStatus, FieldListGroups, FieldsGroupNames } from '../types';

describe('UnifiedFieldList useGroupedFields()', () => {
  let mockedServices: GroupedFieldsParams<DataViewField>['services'];
  const allFields = dataView.fields;
  // Added fields will be treated as Unmapped as they are not a part of the data view.
  const allFieldsIncludingUnmapped = [...new Array(2)].flatMap((_, index) =>
    allFields.map((field) => {
      return new DataViewField({ ...field.toSpec(), name: `${field.name}${index || ''}` });
    })
  );
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
      core: coreMock.createStart(),
    };

    dataViews.get.mockImplementation(async (id: string) => {
      return [dataView, stubDataViewWithoutTimeField].find((dw) => dw.id === id)!;
    });
  });

  it('should work correctly in loading state', async () => {
    const props: GroupedFieldsParams<DataViewField> = {
      dataViewId: dataView.id!,
      allFields: null,
      services: mockedServices,
    };
    const { result, waitForNextUpdate, rerender } = renderHook(useGroupedFields, {
      initialProps: props,
    });

    await waitForNextUpdate();

    let fieldListGroupedProps = result.current.fieldListGroupedProps;
    expect(fieldListGroupedProps.fieldGroups).toMatchSnapshot();
    expect(fieldListGroupedProps.fieldsExistenceStatus).toBe(ExistenceFetchStatus.unknown);
    expect(fieldListGroupedProps.fieldsExistInIndex).toBe(false);
    expect(fieldListGroupedProps.scrollToTopResetCounter).toBeTruthy();

    rerender({
      ...props,
      dataViewId: null, // for text-based queries
      allFields: null,
    });

    fieldListGroupedProps = result.current.fieldListGroupedProps;
    expect(fieldListGroupedProps.fieldsExistenceStatus).toBe(ExistenceFetchStatus.unknown);
    expect(fieldListGroupedProps.fieldsExistInIndex).toBe(true);
    expect(fieldListGroupedProps.scrollToTopResetCounter).toBeTruthy();
  });

  it('should work correctly for no data', async () => {
    const props: GroupedFieldsParams<DataViewField> = {
      dataViewId: dataView.id!,
      allFields: [],
      services: mockedServices,
    };

    jest.spyOn(ExistenceApi, 'useExistingFieldsReader').mockImplementation(
      (): ExistingFieldsReader => ({
        hasFieldData: (dataViewId) => {
          return dataViewId === props.dataViewId;
        },
        getFieldsExistenceStatus: (dataViewId) =>
          dataViewId === props.dataViewId
            ? ExistenceFetchStatus.succeeded
            : ExistenceFetchStatus.unknown,
        isFieldsExistenceInfoUnavailable: (dataViewId) => dataViewId !== props.dataViewId,
        getNewFields: () => [],
      })
    );

    const { result, waitForNextUpdate, rerender } = renderHook(useGroupedFields, {
      initialProps: props,
    });

    await waitForNextUpdate();

    let fieldListGroupedProps = result.current.fieldListGroupedProps;
    const fieldGroups = fieldListGroupedProps.fieldGroups;

    expect(
      Object.keys(fieldGroups!).map(
        (key) => `${key}-${fieldGroups![key as FieldsGroupNames]?.fields.length}`
      )
    ).toStrictEqual([
      'SpecialFields-0',
      'SelectedFields-0',
      'PopularFields-0',
      'AvailableFields-0',
      'UnmappedFields-0',
      'EmptyFields-0',
      'MetaFields-0',
      'SmartFields-0',
    ]);

    expect(fieldGroups).toMatchSnapshot();
    expect(fieldListGroupedProps.fieldsExistenceStatus).toBe(ExistenceFetchStatus.succeeded);
    expect(fieldListGroupedProps.fieldsExistInIndex).toBe(false);

    rerender({
      ...props,
      dataViewId: null, // for text-based queries
      allFields: [],
    });

    fieldListGroupedProps = result.current.fieldListGroupedProps;
    expect(fieldListGroupedProps.fieldsExistenceStatus).toBe(ExistenceFetchStatus.succeeded);
    expect(fieldListGroupedProps.fieldsExistInIndex).toBe(true);

    (ExistenceApi.useExistingFieldsReader as jest.Mock).mockRestore();
  });

  it('should work correctly with fields', async () => {
    const props: GroupedFieldsParams<DataViewField> = {
      dataViewId: dataView.id!,
      allFields,
      services: mockedServices,
    };

    jest.spyOn(ExistenceApi, 'useExistingFieldsReader').mockImplementation(
      (): ExistingFieldsReader => ({
        hasFieldData: (dataViewId) => {
          return dataViewId === props.dataViewId;
        },
        getFieldsExistenceStatus: (dataViewId) =>
          dataViewId === props.dataViewId
            ? ExistenceFetchStatus.succeeded
            : ExistenceFetchStatus.unknown,
        isFieldsExistenceInfoUnavailable: (dataViewId) => dataViewId !== props.dataViewId,
        getNewFields: () => [],
      })
    );

    const { result, waitForNextUpdate, rerender } = renderHook(useGroupedFields, {
      initialProps: props,
    });

    await waitForNextUpdate();

    let fieldListGroupedProps = result.current.fieldListGroupedProps;
    const fieldGroups = fieldListGroupedProps.fieldGroups;
    const scrollToTopResetCounter1 = fieldListGroupedProps.scrollToTopResetCounter;

    expect(
      Object.keys(fieldGroups!).map(
        (key) => `${key}-${fieldGroups![key as FieldsGroupNames]?.fields.length}`
      )
    ).toStrictEqual([
      'SpecialFields-0',
      'SelectedFields-0',
      'PopularFields-0',
      'AvailableFields-25',
      'UnmappedFields-0',
      'EmptyFields-0',
      'MetaFields-3',
      'SmartFields-0',
    ]);

    expect(fieldListGroupedProps.fieldsExistenceStatus).toBe(ExistenceFetchStatus.succeeded);
    expect(fieldListGroupedProps.fieldsExistInIndex).toBe(true);
    expect(result.current.allFieldsModified).toBe(allFields);
    expect(result.current.hasNewFields).toBe(false);

    rerender({
      ...props,
      dataViewId: null, // for text-based queries
      allFields,
    });

    fieldListGroupedProps = result.current.fieldListGroupedProps;
    expect(fieldListGroupedProps.fieldsExistenceStatus).toBe(ExistenceFetchStatus.succeeded);
    expect(fieldListGroupedProps.fieldsExistInIndex).toBe(true);
    expect(result.current.fieldListGroupedProps.scrollToTopResetCounter).not.toBe(
      scrollToTopResetCounter1
    );
    expect(result.current.allFieldsModified).toBe(allFields);
    expect(result.current.hasNewFields).toBe(false);

    (ExistenceApi.useExistingFieldsReader as jest.Mock).mockRestore();
  });

  it('should work correctly with new fields', async () => {
    const props: GroupedFieldsParams<DataViewField> = {
      dataViewId: dataView.id!,
      allFields,
      services: mockedServices,
      getNewFieldsBySpec: (spec) => spec.map((field) => new DataViewField(field)),
    };

    const newField = { name: 'test', type: 'keyword', searchable: true, aggregatable: true };

    jest.spyOn(ExistenceApi, 'useExistingFieldsReader').mockImplementation(
      (): ExistingFieldsReader => ({
        hasFieldData: (dataViewId) => {
          return dataViewId === props.dataViewId;
        },
        getFieldsExistenceStatus: (dataViewId) =>
          dataViewId === props.dataViewId
            ? ExistenceFetchStatus.succeeded
            : ExistenceFetchStatus.unknown,
        isFieldsExistenceInfoUnavailable: (dataViewId) => dataViewId !== props.dataViewId,
        getNewFields: () => [newField],
      })
    );

    const { result, waitForNextUpdate, rerender } = renderHook(useGroupedFields, {
      initialProps: props,
    });

    await waitForNextUpdate();

    let fieldListGroupedProps = result.current.fieldListGroupedProps;
    const fieldGroups = fieldListGroupedProps.fieldGroups;
    const scrollToTopResetCounter1 = fieldListGroupedProps.scrollToTopResetCounter;

    expect(
      Object.keys(fieldGroups!).map(
        (key) => `${key}-${fieldGroups![key as FieldsGroupNames]?.fields.length}`
      )
    ).toStrictEqual([
      'SpecialFields-0',
      'SelectedFields-0',
      'PopularFields-0',
      'AvailableFields-25',
      'UnmappedFields-1',
      'EmptyFields-0',
      'MetaFields-3',
      'SmartFields-0',
    ]);

    expect(fieldListGroupedProps.fieldsExistenceStatus).toBe(ExistenceFetchStatus.succeeded);
    expect(fieldListGroupedProps.fieldsExistInIndex).toBe(true);
    expect(result.current.allFieldsModified).toStrictEqual([
      ...allFields,
      new DataViewField(newField),
    ]);
    expect(result.current.hasNewFields).toBe(true);

    rerender({
      ...props,
      dataViewId: null, // for text-based queries
      allFields,
    });

    fieldListGroupedProps = result.current.fieldListGroupedProps;
    expect(fieldListGroupedProps.fieldsExistenceStatus).toBe(ExistenceFetchStatus.succeeded);
    expect(fieldListGroupedProps.fieldsExistInIndex).toBe(true);
    expect(result.current.fieldListGroupedProps.scrollToTopResetCounter).not.toBe(
      scrollToTopResetCounter1
    );
    expect(result.current.allFieldsModified).toBe(allFields);
    expect(result.current.hasNewFields).toBe(false);

    (ExistenceApi.useExistingFieldsReader as jest.Mock).mockRestore();
  });

  it('should work correctly when searched and filtered', async () => {
    const props: GroupedFieldsParams<DataViewField> = {
      dataViewId: dataView.id!,
      allFields: allFieldsIncludingUnmapped,
      services: mockedServices,
    };
    const { result, waitForNextUpdate } = renderHook(useGroupedFields, {
      initialProps: props,
    });

    await waitForNextUpdate();

    let fieldGroups = result.current.fieldListGroupedProps.fieldGroups;

    expect(
      Object.keys(fieldGroups!).map(
        (key) =>
          `${key}-${fieldGroups![key as FieldsGroupNames]?.fields.length}-${
            fieldGroups![key as FieldsGroupNames]?.fieldCount
          }`
      )
    ).toStrictEqual([
      'SpecialFields-0-0',
      'SelectedFields-0-0',
      'PopularFields-0-0',
      'AvailableFields-25-25',
      'UnmappedFields-28-28',
      'EmptyFields-0-0',
      'MetaFields-3-3',
      'SmartFields-0-0',
    ]);

    act(() => {
      result.current.fieldListFiltersProps.onChangeNameFilter('@');
    });

    fieldGroups = result.current.fieldListGroupedProps.fieldGroups;

    expect(
      Object.keys(fieldGroups!).map(
        (key) =>
          `${key}-${fieldGroups![key as FieldsGroupNames]?.fields.length}-${
            fieldGroups![key as FieldsGroupNames]?.fieldCount
          }`
      )
    ).toStrictEqual([
      'SpecialFields-0-0',
      'SelectedFields-0-0',
      'PopularFields-0-0',
      'AvailableFields-2-25',
      'UnmappedFields-2-28',
      'EmptyFields-0-0',
      'MetaFields-0-3',
      'SmartFields-0-0',
    ]);

    act(() => {
      result.current.fieldListFiltersProps.onChangeFieldTypes(['date']);
    });

    fieldGroups = result.current.fieldListGroupedProps.fieldGroups;

    expect(
      Object.keys(fieldGroups!).map(
        (key) =>
          `${key}-${fieldGroups![key as FieldsGroupNames]?.fields.length}-${
            fieldGroups![key as FieldsGroupNames]?.fieldCount
          }`
      )
    ).toStrictEqual([
      'SpecialFields-0-0',
      'SelectedFields-0-0',
      'PopularFields-0-0',
      'AvailableFields-1-25',
      'UnmappedFields-1-28',
      'EmptyFields-0-0',
      'MetaFields-0-3',
      'SmartFields-0-0',
    ]);
  });

  it('should not change the scroll position if fields list is extended', async () => {
    const props: GroupedFieldsParams<DataViewField> = {
      dataViewId: dataView.id!,
      allFields,
      services: mockedServices,
    };
    const { result, waitForNextUpdate, rerender } = renderHook(useGroupedFields, {
      initialProps: props,
    });

    await waitForNextUpdate();

    const scrollToTopResetCounter1 = result.current.fieldListGroupedProps.scrollToTopResetCounter;

    rerender({
      ...props,
      allFields: allFieldsIncludingUnmapped,
    });

    expect(result.current.fieldListGroupedProps.scrollToTopResetCounter).toBe(
      scrollToTopResetCounter1
    );
  });

  it('should work correctly when custom unsupported fields are skipped', async () => {
    const { result, waitForNextUpdate } = renderHook(useGroupedFields, {
      initialProps: {
        dataViewId: dataView.id!,
        allFields,
        services: mockedServices,
        onSupportedFieldFilter: (field: DataViewField) => field.aggregatable,
      },
    });

    await waitForNextUpdate();

    const fieldGroups = result.current.fieldListGroupedProps.fieldGroups;

    expect(
      Object.keys(fieldGroups!).map(
        (key) => `${key}-${fieldGroups![key as FieldsGroupNames]?.fields.length}`
      )
    ).toStrictEqual([
      'SpecialFields-0',
      'SelectedFields-0',
      'PopularFields-0',
      'AvailableFields-23',
      'UnmappedFields-0',
      'EmptyFields-0',
      'MetaFields-3',
      'SmartFields-0',
    ]);
  });

  it('should work correctly when selected fields are present', async () => {
    const { result, waitForNextUpdate } = renderHook(useGroupedFields, {
      initialProps: {
        dataViewId: dataView.id!,
        allFields,
        services: mockedServices,
        onSelectedFieldFilter: (field: DataViewField) =>
          ['bytes', 'extension', '_id', '@timestamp'].includes(field.name),
      },
    });

    await waitForNextUpdate();

    const fieldGroups = result.current.fieldListGroupedProps.fieldGroups;

    expect(
      Object.keys(fieldGroups!).map(
        (key) => `${key}-${fieldGroups![key as FieldsGroupNames]?.fields.length}`
      )
    ).toStrictEqual([
      'SpecialFields-0',
      'SelectedFields-4',
      'PopularFields-0',
      'AvailableFields-25',
      'UnmappedFields-0',
      'EmptyFields-0',
      'MetaFields-3',
      'SmartFields-0',
    ]);
  });

  it('should work correctly for text-based queries (no data view)', async () => {
    const { result } = renderHook(useGroupedFields, {
      initialProps: {
        dataViewId: null,
        allFields: allFieldsIncludingUnmapped,
        services: mockedServices,
      },
    });

    const fieldListGroupedProps = result.current.fieldListGroupedProps;
    const fieldGroups = fieldListGroupedProps.fieldGroups;

    expect(
      Object.keys(fieldGroups!).map(
        (key) => `${key}-${fieldGroups![key as FieldsGroupNames]?.fields.length}`
      )
    ).toStrictEqual([
      'SpecialFields-0',
      'SelectedFields-0',
      'PopularFields-0',
      'AvailableFields-56', // even unmapped fields fall into Available
      'UnmappedFields-0',
      'MetaFields-0',
      'SmartFields-0',
    ]);

    expect(fieldListGroupedProps.fieldsExistenceStatus).toBe(ExistenceFetchStatus.succeeded);
    expect(fieldListGroupedProps.fieldsExistInIndex).toBe(true);
  });

  it('should work correctly for text-based queries (no data view) with isNull fields', async () => {
    const allFieldsEmpty = [...new Array(2)].flatMap((_, index) =>
      allFields.map((field) => {
        return new DataViewField({
          ...field.toSpec(),
          name: `${field.name}${index || ''}`,
          isNull: true,
        });
      })
    );
    const { result } = renderHook(useGroupedFields, {
      initialProps: {
        dataViewId: null,
        allFields: allFieldsEmpty,
        services: mockedServices,
      },
    });

    const fieldListGroupedProps = result.current.fieldListGroupedProps;
    const fieldGroups = fieldListGroupedProps.fieldGroups;

    expect(
      Object.keys(fieldGroups!).map(
        (key) => `${key}-${fieldGroups![key as FieldsGroupNames]?.fields.length}`
      )
    ).toStrictEqual([
      'SpecialFields-0',
      'SelectedFields-0',
      'PopularFields-0',
      'AvailableFields-0',
      'UnmappedFields-0',
      'EmptyFields-56',
      'MetaFields-0',
      'SmartFields-0',
    ]);

    expect(fieldListGroupedProps.fieldsExistenceStatus).toBe(ExistenceFetchStatus.succeeded);
    expect(fieldListGroupedProps.fieldsExistInIndex).toBe(true);
  });

  it('should work correctly when details are overwritten', async () => {
    const onOverrideFieldGroupDetails: GroupedFieldsParams<DataViewField>['onOverrideFieldGroupDetails'] =
      jest.fn((groupName) => {
        if (groupName === FieldsGroupNames.SelectedFields) {
          return {
            helpText: 'test',
          };
        }
      });
    const { result, waitForNextUpdate } = renderHook(useGroupedFields, {
      initialProps: {
        dataViewId: dataView.id!,
        allFields,
        services: mockedServices,
        onOverrideFieldGroupDetails,
      },
    });

    await waitForNextUpdate();

    const fieldGroups = result.current.fieldListGroupedProps.fieldGroups;

    expect(fieldGroups[FieldsGroupNames.SelectedFields]?.helpText).toBe('test');
    expect(fieldGroups[FieldsGroupNames.AvailableFields]?.helpText).not.toBe('test');
    expect(onOverrideFieldGroupDetails).toHaveBeenCalled();
  });

  it('should work correctly when changing a data view and existence info is available only for one of them', async () => {
    const knownDataViewId = dataView.id!;
    let fieldGroups: FieldListGroups<DataViewField>;
    const props: GroupedFieldsParams<DataViewField> = {
      dataViewId: dataView.id!,
      allFields,
      services: mockedServices,
    };

    jest.spyOn(ExistenceApi, 'useExistingFieldsReader').mockImplementation(
      (): ExistingFieldsReader => ({
        hasFieldData: (dataViewId, fieldName) => {
          return dataViewId === knownDataViewId && ['bytes', 'extension'].includes(fieldName);
        },
        getFieldsExistenceStatus: (dataViewId) =>
          dataViewId === knownDataViewId
            ? ExistenceFetchStatus.succeeded
            : ExistenceFetchStatus.unknown,
        isFieldsExistenceInfoUnavailable: (dataViewId) => dataViewId !== knownDataViewId,
        getNewFields: () => [],
      })
    );

    const { result, waitForNextUpdate, rerender } = renderHook(useGroupedFields, {
      initialProps: props,
    });
    await waitForNextUpdate();

    let fieldListGroupedProps = result.current.fieldListGroupedProps;
    fieldGroups = fieldListGroupedProps.fieldGroups;

    expect(
      Object.keys(fieldGroups!).map(
        (key) => `${key}-${fieldGroups![key as FieldsGroupNames]?.fields.length}`
      )
    ).toStrictEqual([
      'SpecialFields-0',
      'SelectedFields-0',
      'PopularFields-0',
      'AvailableFields-2',
      'UnmappedFields-0',
      'EmptyFields-23',
      'MetaFields-3',
      'SmartFields-0',
    ]);

    expect(fieldListGroupedProps.fieldsExistenceStatus).toBe(ExistenceFetchStatus.succeeded);
    expect(fieldListGroupedProps.fieldsExistInIndex).toBe(true);

    rerender({
      ...props,
      dataViewId: anotherDataView.id!,
      allFields: anotherDataView.fields,
    });

    await waitForNextUpdate();

    fieldListGroupedProps = result.current.fieldListGroupedProps;
    fieldGroups = fieldListGroupedProps.fieldGroups;

    expect(
      Object.keys(fieldGroups!).map(
        (key) => `${key}-${fieldGroups![key as FieldsGroupNames]?.fields.length}`
      )
    ).toStrictEqual([
      'SpecialFields-0',
      'SelectedFields-0',
      'PopularFields-0',
      'AvailableFields-8',
      'UnmappedFields-0',
      'MetaFields-0',
      'SmartFields-0',
    ]);

    expect(fieldListGroupedProps.fieldsExistenceStatus).toBe(ExistenceFetchStatus.unknown);
    expect(fieldListGroupedProps.fieldsExistInIndex).toBe(true);

    (ExistenceApi.useExistingFieldsReader as jest.Mock).mockRestore();
  });

  it('should work correctly when popular fields limit is present', async () => {
    // `bytes` is popular, but we are skipping it here to test that it would not be shown under Popular and Available
    const onSupportedFieldFilter = jest.fn((field) => field.name !== 'bytes');

    const { result, waitForNextUpdate } = renderHook(useGroupedFields, {
      initialProps: {
        dataViewId: dataView.id!,
        allFields,
        popularFieldsLimit: 10,
        services: mockedServices,
        onSupportedFieldFilter,
      },
    });

    await waitForNextUpdate();

    const fieldGroups = result.current.fieldListGroupedProps.fieldGroups;

    expect(
      Object.keys(fieldGroups!).map(
        (key) => `${key}-${fieldGroups![key as FieldsGroupNames]?.fields.length}`
      )
    ).toStrictEqual([
      'SpecialFields-0',
      'SelectedFields-0',
      'PopularFields-3',
      'AvailableFields-24',
      'UnmappedFields-0',
      'EmptyFields-0',
      'MetaFields-3',
      'SmartFields-0',
    ]);

    expect(fieldGroups.PopularFields?.fields.map((field) => field.name).join(',')).toBe(
      '@timestamp,time,ssl'
    );
  });

  it('should work correctly when global filters are set', async () => {
    const { result, waitForNextUpdate } = renderHook(useGroupedFields, {
      initialProps: {
        dataViewId: dataView.id!,
        allFields: [],
        isAffectedByGlobalFilter: true,
        services: mockedServices,
      },
    });

    await waitForNextUpdate();

    const fieldGroups = result.current.fieldListGroupedProps.fieldGroups;
    expect(fieldGroups).toMatchSnapshot();
  });

  it('should work correctly and show unmapped fields separately', async () => {
    const { result, waitForNextUpdate } = renderHook(useGroupedFields, {
      initialProps: {
        dataViewId: dataView.id!,
        allFields: allFieldsIncludingUnmapped,
        services: mockedServices,
      },
    });

    await waitForNextUpdate();

    const fieldGroups = result.current.fieldListGroupedProps.fieldGroups;

    expect(
      Object.keys(fieldGroups!).map(
        (key) => `${key}-${fieldGroups![key as FieldsGroupNames]?.fields.length}`
      )
    ).toStrictEqual([
      'SpecialFields-0',
      'SelectedFields-0',
      'PopularFields-0',
      'AvailableFields-25',
      'UnmappedFields-28',
      'EmptyFields-0',
      'MetaFields-3',
      'SmartFields-0',
    ]);
  });

  it('should work correctly when custom selected fields are provided', async () => {
    const customSortedFields = [
      allFieldsIncludingUnmapped[allFieldsIncludingUnmapped.length - 1],
      allFields[2],
      allFields[0],
    ];
    const { result, waitForNextUpdate } = renderHook(useGroupedFields, {
      initialProps: {
        dataViewId: dataView.id!,
        allFields,
        sortedSelectedFields: customSortedFields,
        services: mockedServices,
      },
    });

    await waitForNextUpdate();

    const fieldGroups = result.current.fieldListGroupedProps.fieldGroups;

    expect(
      Object.keys(fieldGroups!).map(
        (key) => `${key}-${fieldGroups![key as FieldsGroupNames]?.fields.length}`
      )
    ).toStrictEqual([
      'SpecialFields-0',
      'SelectedFields-3',
      'PopularFields-0',
      'AvailableFields-25',
      'UnmappedFields-0',
      'EmptyFields-0',
      'MetaFields-3',
      'SmartFields-0',
    ]);

    expect(fieldGroups.SelectedFields?.fields).toBe(customSortedFields);
  });

  it('should include filters props', async () => {
    const { result, waitForNextUpdate } = renderHook(useGroupedFields, {
      initialProps: {
        dataViewId: dataView.id!,
        allFields,
        services: mockedServices,
      },
    });

    await waitForNextUpdate();

    const { fieldListFiltersProps, fieldListGroupedProps } = result.current;
    const fieldGroups = fieldListGroupedProps.fieldGroups;

    expect(fieldGroups.AvailableFields?.fields?.length).toBe(25);
    expect(fieldGroups.AvailableFields?.fieldSearchHighlight).toBeUndefined();
    expect(fieldListFiltersProps.screenReaderDescriptionId).toBe(
      fieldListGroupedProps.screenReaderDescriptionId
    );

    act(() => {
      fieldListFiltersProps.onChangeNameFilter('Me');
    });

    const {
      fieldListFiltersProps: newFieldListFiltersProps,
      fieldListGroupedProps: newFieldListGroupedProps,
    } = result.current;
    const newFieldGroups = newFieldListGroupedProps.fieldGroups;
    expect(newFieldGroups.AvailableFields?.fields?.length).toBe(4);
    expect(newFieldGroups.AvailableFields?.fieldSearchHighlight).toBe('me');
    expect(newFieldListFiltersProps.screenReaderDescriptionId).toBe(
      newFieldListGroupedProps.screenReaderDescriptionId
    );

    act(() => {
      newFieldListFiltersProps.onChangeFieldTypes?.(['date']);
    });

    expect(result.current.fieldListGroupedProps.fieldGroups.AvailableFields?.fields?.length).toBe(
      3
    );
  });

  it('should include additional fields when additionalFieldGroups are provided', async () => {
    const smartFields = [
      new DataViewField({
        name: 'mock_field',
        type: 'mock_field',
        searchable: false,
        aggregatable: false,
      }),
    ];

    const additionalFieldGroups = {
      smartFields,
    };
    const { result, waitForNextUpdate } = renderHook(useGroupedFields, {
      initialProps: {
        dataViewId: dataView.id!,
        allFields,
        services: mockedServices,
        additionalFieldGroups,
      },
    });

    await waitForNextUpdate();
    const fieldListGroupedProps = result.current.fieldListGroupedProps;
    const fieldGroups = fieldListGroupedProps.fieldGroups;
    expect(fieldGroups.SmartFields?.fields?.length).toBe(1);
    expect(
      Object.keys(fieldGroups!).map(
        (key) => `${key}-${fieldGroups![key as FieldsGroupNames]?.fields.length}`
      )
    ).toStrictEqual([
      'SpecialFields-0',
      'SelectedFields-0',
      'PopularFields-0',
      'AvailableFields-25',
      'UnmappedFields-0',
      'EmptyFields-0',
      'MetaFields-3',
      'SmartFields-1',
    ]);
  });
});
