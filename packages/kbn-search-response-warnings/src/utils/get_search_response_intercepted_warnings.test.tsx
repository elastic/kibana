/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { getSearchResponseInterceptedWarnings } from './get_search_response_intercepted_warnings';
import { searchResponseIncompleteWarningLocalCluster } from '../__mocks__/search_response_warnings';

const servicesMock = {
  data: dataPluginMock.createStartContract(),
  theme: coreMock.createStart().theme,
};

describe('getSearchResponseInterceptedWarnings', () => {
  const adapter = new RequestAdapter();

  it('should return intercepted incomplete data warnings', () => {
    const services = {
      ...servicesMock,
    };
    services.data.search.showWarnings = jest.fn((_, callback) => {
      // @ts-expect-error for empty meta
      callback?.(searchResponseIncompleteWarningLocalCluster, {});
    });
    const warnings = getSearchResponseInterceptedWarnings({
      services,
      adapter,
    });

    expect(warnings.length).toBe(1);
    expect(warnings[0].originalWarning).toEqual(searchResponseIncompleteWarningLocalCluster);
    expect(warnings[0].action).toMatchInlineSnapshot(`
      <ViewWarningButton
        color="primary"
        isButtonEmpty={true}
        onClick={[Function]}
        size="s"
      />
    `);
  });
});
