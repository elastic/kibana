/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { dataViewWithTimefieldMock } from '../../public/__mocks__/data_view_with_timefield';
import { createDataSource, createDataViewDataSource, createEsqlDataSource } from './utils';

describe('createDataSource', () => {
  it('should return ES|QL source when ES|QL query', () => {
    const dataView = dataViewWithTimefieldMock;
    const query = { esql: 'FROM *' };
    const result = createDataSource({ dataView, query });
    expect(result).toEqual(createEsqlDataSource());
  });

  it('should return data view source when not ES|QL query and dataView id is defined', () => {
    const dataView = dataViewWithTimefieldMock;
    const query = { language: 'kql', query: 'test' };
    const result = createDataSource({ dataView, query });
    expect(result).toEqual(createDataViewDataSource({ dataViewId: dataView.id! }));
  });

  it('should return undefined when not ES|QL query and dataView id is not defined', () => {
    const dataView = { ...dataViewWithTimefieldMock, id: undefined } as DataView;
    const query = { language: 'kql', query: 'test' };
    const result = createDataSource({ dataView, query });
    expect(result).toEqual(undefined);
  });
});
