/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { updateSearchSource } from './context';
import { dataViewMock } from '../../../__mocks__/data_view';
import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';

describe('context api', function () {
  test('createSearchSource when useFieldsApi is true', () => {
    const newSearchSource = createSearchSourceMock({ index: dataViewMock });
    const searchSource = updateSearchSource(newSearchSource, dataViewMock, [], true);
    expect(searchSource.getSearchRequestBody()).toMatchSnapshot();
  });
  test('createSearchSource when useFieldsApi is false', () => {
    const newSearchSource = createSearchSourceMock({ index: dataViewMock });
    const searchSource = updateSearchSource(newSearchSource, dataViewMock, [], false);
    expect(searchSource.getSearchRequestBody()).toMatchSnapshot();
  });
});
