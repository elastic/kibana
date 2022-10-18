/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { renderHook } from '@testing-library/react-hooks';
import { useRootBreadcrumb } from './use_root_breadcrumb';
import { DiscoverAppLocatorParams } from '../locator';

const mockServices = {
  locator: {
    getUrl: (params: DiscoverAppLocatorParams) =>
      Promise.resolve(
        Object.keys(params)
          .map((key) => `${key}:${JSON.stringify(params[key])}`)
          .join(',')
      ),
  },
};

describe('useRootBreadcrumb', () => {
  it('should return correct url', async () => {
    const renderHookResult = renderHook(
      () =>
        useRootBreadcrumb({
          dataViewId: 'mock-data-view-id',
          filters: [
            {
              meta: {
                disabled: false,
                negate: false,
                type: 'phrase',
                key: 'extension',
                params: { query: 'jpg' },
              },
            },
          ],
          columns: ['extension', 'bytes'],
          timeRange: {
            from: 'now-15m',
            to: 'now',
          },
          query: {
            language: 'kuery',
            query: 'response:200',
          },
          savedSearchId: 'mock-saved-search-id',
        }),
      {
        wrapper: ({ children }) => (
          <KibanaContextProvider services={mockServices}>{children}</KibanaContextProvider>
        ),
      }
    );
    await renderHookResult.waitForNextUpdate();

    expect(renderHookResult.result.current).toMatchInlineSnapshot(
      `"dataViewId:\\"mock-data-view-id\\",filters:[{\\"meta\\":{\\"disabled\\":false,\\"negate\\":false,\\"type\\":\\"phrase\\",\\"key\\":\\"extension\\",\\"params\\":{\\"query\\":\\"jpg\\"}}}],columns:[\\"extension\\",\\"bytes\\"],timeRange:{\\"from\\":\\"now-15m\\",\\"to\\":\\"now\\"},query:{\\"language\\":\\"kuery\\",\\"query\\":\\"response:200\\"},savedSearchId:\\"mock-saved-search-id\\""`
    );
  });
});
