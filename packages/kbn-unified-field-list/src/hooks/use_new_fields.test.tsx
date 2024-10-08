/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react-hooks';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { useNewFields, type UseNewFieldsParams } from './use_new_fields';
import { type ExistingFieldsReader } from './use_existing_fields';
import { ExistenceFetchStatus } from '../types';

const fieldsExistenceReader: ExistingFieldsReader = {
  hasFieldData: (dataViewId) => {
    return dataViewId === dataView.id;
  },
  getFieldsExistenceStatus: (dataViewId) =>
    dataViewId === dataView.id ? ExistenceFetchStatus.succeeded : ExistenceFetchStatus.unknown,
  isFieldsExistenceInfoUnavailable: (dataViewId) => dataViewId !== dataView.id,
  getNewFields: () => [],
};

describe('UnifiedFieldList useNewFields()', () => {
  const allFields = dataView.fields;

  it('should work correctly in loading state', async () => {
    const props: UseNewFieldsParams<DataViewField> = {
      dataView,
      allFields: null,
      fieldsExistenceReader,
    };
    const { result } = renderHook(useNewFields, {
      initialProps: props,
    });

    expect(result.current.allFieldsModified).toBe(null);
    expect(result.current.hasNewFields).toBe(false);
  });

  it('should work correctly with empty new fields', async () => {
    const props: UseNewFieldsParams<DataViewField> = {
      dataView,
      allFields,
      fieldsExistenceReader,
    };
    const { result } = renderHook(useNewFields, {
      initialProps: props,
    });

    expect(result.current.allFieldsModified).toBe(allFields);
    expect(result.current.hasNewFields).toBe(false);
  });

  it('should work correctly with new fields', async () => {
    const newField = { name: 'test', type: 'keyword', searchable: true, aggregatable: true };
    const newField2 = { ...newField, name: 'test2' };
    const props: UseNewFieldsParams<DataViewField> = {
      dataView,
      allFields,
      fieldsExistenceReader: {
        ...fieldsExistenceReader,
        getNewFields: () => [newField, newField2],
      },
      getNewFieldsBySpec: (spec) => spec.map((field) => new DataViewField(field)),
    };
    const { result } = renderHook(useNewFields, {
      initialProps: props,
    });

    expect(result.current.allFieldsModified).toStrictEqual([
      ...allFields,
      new DataViewField(newField),
      new DataViewField(newField2),
    ]);
    expect(result.current.hasNewFields).toBe(true);
  });
});
