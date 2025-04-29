/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { updateSearchSource } from './context';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';

describe('context api', function () {
  test('createSearchSource', () => {
    const newSearchSource = createSearchSourceMock({ index: dataViewMock });
    const searchSource = updateSearchSource(newSearchSource, dataViewMock, []);
    expect(searchSource.getSearchRequestBody()).toMatchSnapshot();
  });
});
