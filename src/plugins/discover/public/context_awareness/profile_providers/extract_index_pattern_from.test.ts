/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createDataViewDataSource, createEsqlDataSource } from '../../../common/data_sources';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import { extractIndexPatternFrom } from './extract_index_pattern_from';

describe('extractIndexPatternFrom', () => {
  it('should return index pattern from data view', () => {
    const indexPattern = extractIndexPatternFrom({
      dataSource: createDataViewDataSource({ dataViewId: dataViewWithTimefieldMock.id! }),
      dataView: dataViewWithTimefieldMock,
    });
    expect(indexPattern).toBe(dataViewWithTimefieldMock.getIndexPattern());
  });

  it('should return index pattern from ES|QL query', () => {
    const indexPattern = extractIndexPatternFrom({
      dataSource: createEsqlDataSource(),
      query: { esql: 'FROM index-pattern' },
    });
    expect(indexPattern).toBe('index-pattern');
  });

  it('should return null if no data view or ES|QL query', () => {
    let indexPattern = extractIndexPatternFrom({
      dataSource: createDataViewDataSource({ dataViewId: dataViewWithTimefieldMock.id! }),
    });
    expect(indexPattern).toBeNull();
    indexPattern = extractIndexPatternFrom({
      dataSource: createEsqlDataSource(),
    });
    expect(indexPattern).toBeNull();
  });
});
