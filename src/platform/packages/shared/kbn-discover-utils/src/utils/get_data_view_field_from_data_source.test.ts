/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataViewSource } from '@kbn/data-source';
import { createDataViewWithBytesField, esqlSourceOverridingBytesType } from '../__mocks__';
import { getDataViewFieldFromDataSource } from './get_data_view_field_from_data_source';

describe('getDataViewFieldFromDataSource', () => {
  const dataView = createDataViewWithBytesField();

  it('types the field by the ES|QL column', () => {
    const field = getDataViewFieldFromDataSource({
      dataView,
      dataSource: esqlSourceOverridingBytesType,
      fieldName: 'bytes',
    });

    expect(field?.type).toBe('string');
    expect(field?.esTypes).toEqual(['keyword']);
  });

  it('returns the data view field for a data view source', () => {
    const field = getDataViewFieldFromDataSource({
      dataView,
      dataSource: new DataViewSource(dataView),
      fieldName: 'bytes',
    });

    expect(field).toBe(dataView.fields.getByName('bytes'));
  });

  it('returns the data view field without a data source', () => {
    expect(
      getDataViewFieldFromDataSource({ dataView, dataSource: undefined, fieldName: 'bytes' })
    ).toBe(dataView.fields.getByName('bytes'));
  });
});
