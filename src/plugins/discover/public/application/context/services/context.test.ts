/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { updateSearchSource } from './context';
import { indexPatternMock } from '../../../__mocks__/index_pattern';
import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';

describe('context api', function () {
  test('createSearchSource when useFieldsApi is true', () => {
    const newSearchSource = createSearchSourceMock({ index: indexPatternMock });
    const searchSource = updateSearchSource(newSearchSource, indexPatternMock, [], true);
    expect(searchSource.getSearchRequestBody()).toMatchSnapshot();
  });
  test('createSearchSource when useFieldsApi is false', () => {
    const newSearchSource = createSearchSourceMock({ index: indexPatternMock });
    const searchSource = updateSearchSource(newSearchSource, indexPatternMock, [], false);
    expect(searchSource.getSearchRequestBody()).toMatchSnapshot();
  });
});
