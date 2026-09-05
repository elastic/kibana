/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AS_CODE_ESQL_DATA_SOURCE_TYPE } from '@kbn/as-code-data-views-schema';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DiscoverAppLocator } from '../../common';
import type { DiscoverSessionApiData } from '../../server';
import { DiscoverSessionInline } from './discover_session_inline';

const embeddableApi = {
  setTimeRange: jest.fn(),
};

jest.mock('@kbn/embeddable-plugin/public', () => ({
  EmbeddableRenderer: jest.fn(),
}));

const sessionData: DiscoverSessionApiData = {
  title: 'Nginx errors',
  description: '',
  tabs: [
    {
      id: 'tab-1',
      label: 'Documents',
      data_source: {
        type: AS_CODE_ESQL_DATA_SOURCE_TYPE,
        query: 'FROM logs-* | LIMIT 100',
      },
      hide_chart: true,
      hide_table: false,
      time_range: { from: 'now-24h', to: 'now' },
      column_order: ['@timestamp', 'message'],
      sort: [],
    },
  ],
};

describe('DiscoverSessionInline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(EmbeddableRenderer).mockImplementation(({ onApiAvailable }) => {
      onApiAvailable?.(embeddableApi as never);
      return <div data-test-subj="mockedSearchEmbeddable" />;
    });
  });

  it('keeps a local time picker and opens Discover with the selected range', async () => {
    const user = userEvent.setup();
    const registerActionButtons = jest.fn();
    const navigate = jest.fn();
    const capturedSearchBarProps: Array<{
      appName?: string;
      disableSubscribingToGlobalDataServices?: boolean;
      onQuerySubmit?: (payload: { dateRange: { from: string; to: string } }) => void;
    }> = [];

    const SearchBar = (props: (typeof capturedSearchBarProps)[number]) => {
      capturedSearchBarProps.push(props);
      return (
        <button
          type="button"
          onClick={() => props.onQuerySubmit?.({ dateRange: { from: 'now-15m', to: 'now' } })}
        >
          change time
        </button>
      );
    };

    render(
      <DiscoverSessionInline
        data={sessionData}
        unifiedSearch={{ ui: { SearchBar } } as unknown as UnifiedSearchPublicPluginStart}
        locator={{ navigate } as unknown as DiscoverAppLocator}
        registerActionButtons={registerActionButtons}
      />
    );

    expect(capturedSearchBarProps[0]).toEqual(
      expect.objectContaining({
        appName: 'agentBuilder',
        disableSubscribingToGlobalDataServices: true,
      })
    );

    await user.click(screen.getByRole('button', { name: 'change time' }));

    await waitFor(() => {
      expect(embeddableApi.setTimeRange).toHaveBeenCalledWith({ from: 'now-15m', to: 'now' });
    });

    const actionButtons = registerActionButtons.mock.calls.at(-1)?.[0] as Array<{
      handler: () => void;
    }>;
    actionButtons[0].handler();

    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { esql: 'FROM logs-* | LIMIT 100' },
        timeRange: { from: 'now-15m', to: 'now' },
      })
    );
  });
});
