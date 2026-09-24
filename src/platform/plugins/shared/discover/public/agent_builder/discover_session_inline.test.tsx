/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiProvider } from '@elastic/eui';
import { AS_CODE_ESQL_DATA_SOURCE_TYPE } from '@kbn/as-code-data-views-schema';
import type { DiscoverSessionApiData } from '@kbn/as-code-discover-schema';
import { DataGridDensity, DiscoverTabType } from '@kbn/discover-session-constants';
import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import type { ApplicationStart } from '@kbn/core/public';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { ActionButton } from '@kbn/agent-builder-browser/attachments';
import type { DiscoverAppLocator, DiscoverSessionEmbeddableByValueState } from '../../common';
import { useSearchEmbeddableToolbar } from '../embeddable/components/search_embeddable_toolbar_context';
import { DiscoverSessionInline } from './discover_session_inline';

const liveSerializedState: DiscoverSessionEmbeddableByValueState & {
  nonPersistedDisplayOptions: { wrapToolbar: boolean; showKeyboardShortcuts: boolean };
} = {
  title: 'Live table',
  description: '',
  time_range: { from: 'now-15m', to: 'now' },
  nonPersistedDisplayOptions: { wrapToolbar: false, showKeyboardShortcuts: false },
  tabs: [
    {
      data_source: { type: AS_CODE_ESQL_DATA_SOURCE_TYPE, query: 'FROM logs-* | LIMIT 100' },
      type: DiscoverTabType.Default,
      column_order: ['@timestamp'],
      density: DataGridDensity.COMPACT,
      row_height: 2,
      sort: [],
    },
  ],
};

const embeddableApi = {
  setTimeRange: jest.fn(),
  getSerializedStateByValue: jest.fn(() => liveSerializedState),
};

const navigateToWithEmbeddablePackages = jest.fn();

let exposeApi = true;
let embeddableMounts = 0;
let capturedOnSave: ((args: Record<string, unknown>) => Promise<void>) | undefined;
let capturedSaveModalDocumentInfo: { title?: string; description?: string } | undefined;
const capturedSearchBarProps: Array<{
  appName?: string;
  disableSubscribingToGlobalDataServices?: boolean;
  showTimeWindowButtons?: boolean;
  onQueryChange?: (payload: { dateRange: { from: string; to: string } }) => void;
}> = [];

jest.mock('@kbn/embeddable-plugin/public', () => ({
  EmbeddableRenderer: jest.fn(),
}));

jest.mock('@kbn/presentation-util-plugin/public', () => ({
  SavedObjectSaveModalDashboard: (props: {
    onSave: (args: Record<string, unknown>) => Promise<void>;
    documentInfo?: { title?: string; description?: string };
  }) => {
    capturedOnSave = props.onSave;
    capturedSaveModalDocumentInfo = props.documentInfo;
    return <span data-test-subj="discoverAgentBuilderSaveModal" />;
  },
}));

const sessionData: DiscoverSessionApiData = {
  title: 'Nginx errors',
  description: '',
  tabs: [
    {
      id: 'tab-1',
      label: 'Documents',
      type: DiscoverTabType.Default,
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

const SearchBar = (props: {
  appName?: string;
  disableSubscribingToGlobalDataServices?: boolean;
  showTimeWindowButtons?: boolean;
  onQueryChange?: (payload: { dateRange: { from: string; to: string } }) => void;
  onQuerySubmit?: (payload: { dateRange: { from: string; to: string } }) => void;
}) => {
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

const inlineProps = ({
  registerActionButtons,
  canWriteDashboards = true,
  canOpenInDiscover = true,
  data = sessionData,
  version,
}: {
  registerActionButtons?: jest.Mock;
  canWriteDashboards?: boolean;
  canOpenInDiscover?: boolean;
  data?: DiscoverSessionApiData;
  version?: number;
} = {}) => {
  const navigate = jest.fn();
  return {
    navigate,
    element: (
      <EuiProvider>
        <DiscoverSessionInline
          data={data}
          version={version}
          unifiedSearch={{ ui: { SearchBar } } as unknown as UnifiedSearchPublicPluginStart}
          locator={{ navigate } as unknown as DiscoverAppLocator}
          embeddable={
            {
              getStateTransfer: () => ({ navigateToWithEmbeddablePackages }),
            } as unknown as EmbeddableStart
          }
          application={
            {
              capabilities: {
                dashboard_v2: { showWriteControls: canWriteDashboards },
                discover_v2: { show: canOpenInDiscover },
              },
            } as unknown as ApplicationStart
          }
          registerActionButtons={registerActionButtons}
        />
      </EuiProvider>
    ),
  };
};

const renderInline = (options?: Parameters<typeof inlineProps>[0]) => {
  const { navigate, element } = inlineProps(options);
  return { navigate, ...render(element) };
};

const readEmbeddableQuery = (
  getParentApi?: () => {
    getSerializedStateForChild: (childId: string) => unknown;
  }
) => {
  const state = getParentApi?.().getSerializedStateForChild('');
  if (
    typeof state !== 'object' ||
    state === null ||
    !('tabs' in state) ||
    !Array.isArray(state.tabs)
  ) {
    return undefined;
  }

  const [tab] = state.tabs as Array<{ data_source?: { query?: string } }>;
  return tab?.data_source?.query;
};

const MockEmbeddableRenderer = ({
  onApiAvailable,
  getParentApi,
}: {
  onApiAvailable?: (api: never) => void;
  getParentApi?: () => {
    getSerializedStateForChild: (childId: string) => unknown;
  };
}) => {
  const { leftSide, saveToDashboardButton, onVisibleColumnsChange } = useSearchEmbeddableToolbar();

  useEffect(() => {
    embeddableMounts += 1;
  }, []);

  useEffect(() => {
    if (exposeApi) {
      onApiAvailable?.(embeddableApi as never);
    }
  }, [onApiAvailable]);

  useEffect(() => {
    onVisibleColumnsChange?.(['event.action', '@timestamp']);
  }, [onVisibleColumnsChange]);

  return (
    <div data-test-subj="mockedSearchEmbeddable" data-query={readEmbeddableQuery(getParentApi)}>
      {leftSide}
      {saveToDashboardButton}
    </div>
  );
};

describe('DiscoverSessionInline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    exposeApi = true;
    embeddableMounts = 0;
    capturedOnSave = undefined;
    capturedSaveModalDocumentInfo = undefined;
    capturedSearchBarProps.length = 0;
    jest
      .mocked(EmbeddableRenderer)
      .mockImplementation(({ onApiAvailable, getParentApi }) => (
        <MockEmbeddableRenderer onApiAvailable={onApiAvailable} getParentApi={getParentApi} />
      ));
  });

  it('keeps a local time picker and opens Discover with the selected range', async () => {
    const user = userEvent.setup();
    const registerActionButtons = jest.fn();
    const { navigate } = renderInline({ registerActionButtons });

    expect(screen.getByTestId('discoverAgentBuilderSessionTimePicker')).toBeInTheDocument();
    expect(capturedSearchBarProps[0]).toEqual(
      expect.objectContaining({
        appName: 'agentBuilder',
        disableSubscribingToGlobalDataServices: true,
        showTimeWindowButtons: false,
      })
    );
    await waitFor(() => {
      expect(embeddableApi.setTimeRange).toHaveBeenCalledTimes(1);
    });

    await user.click(screen.getByRole('button', { name: 'change time' }));

    await waitFor(() => {
      expect(embeddableApi.setTimeRange).toHaveBeenCalledTimes(2);
      expect(embeddableApi.setTimeRange).toHaveBeenCalledWith({ from: 'now-15m', to: 'now' });
    });

    const actionButtons = registerActionButtons.mock.calls.at(-1)?.[0] as ActionButton[];
    actionButtons.find((button) => button.icon === 'discoverApp')?.handler();

    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { esql: 'FROM logs-* | LIMIT 100' },
        timeRange: { from: 'now-15m', to: 'now' },
      })
    );
  });

  it('commits a legacy picker range and opens Discover with it', async () => {
    const registerActionButtons = jest.fn();
    const { navigate } = renderInline({ registerActionButtons });
    const absoluteRange = {
      from: '2024-01-01T00:00:00.000Z',
      to: '2024-01-02T00:00:00.000Z',
    };

    await waitFor(() => {
      expect(embeddableApi.setTimeRange).toHaveBeenCalledTimes(1);
    });

    act(() => {
      capturedSearchBarProps.at(-1)?.onQueryChange?.({ dateRange: absoluteRange });
    });

    await waitFor(() => {
      expect(embeddableApi.setTimeRange).toHaveBeenCalledWith(absoluteRange);
    });

    const actionButtons = registerActionButtons.mock.calls.at(-1)?.[0] as ActionButton[];
    actionButtons.find((button) => button.icon === 'discoverApp')?.handler();

    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        timeRange: absoluteRange,
      })
    );
  });

  it('opens Discover with the visible columns and live sort', async () => {
    const registerActionButtons = jest.fn();
    const { navigate } = renderInline({ registerActionButtons });

    embeddableApi.getSerializedStateByValue.mockReturnValueOnce({
      ...liveSerializedState,
      tabs: [
        {
          ...liveSerializedState.tabs[0],
          sort: [{ name: 'message', direction: 'asc' }],
        },
      ],
    });

    await waitFor(() => {
      const actionButtons = registerActionButtons.mock.calls.at(-1)?.[0] as ActionButton[];
      expect(actionButtons.find((button) => button.icon === 'discoverApp')).toBeDefined();
    });

    const actionButtons = registerActionButtons.mock.calls.at(-1)?.[0] as ActionButton[];
    actionButtons.find((button) => button.icon === 'discoverApp')?.handler();

    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        columns: ['event.action', '@timestamp'],
        sort: [['message', 'asc']],
        query: { esql: 'FROM logs-* | LIMIT 100' },
      })
    );
  });

  it('does not offer Open in Discover until the embeddable API is available', () => {
    exposeApi = false;
    const registerActionButtons = jest.fn();
    renderInline({ registerActionButtons });

    const actionButtons = registerActionButtons.mock.calls.at(-1)?.[0] as ActionButton[];
    expect(actionButtons.find((button) => button.icon === 'discoverApp')).toBeUndefined();
  });

  it('hides Open in Discover when the user cannot open Discover', () => {
    const registerActionButtons = jest.fn();
    renderInline({ registerActionButtons, canOpenInDiscover: false });

    const actionButtons = registerActionButtons.mock.calls.at(-1)?.[0] as ActionButton[];
    expect(actionButtons.find((button) => button.icon === 'discoverApp')).toBeUndefined();
  });

  it('reloads the embeddable when a follow-up changes the query', async () => {
    const user = userEvent.setup();
    const updatedQuery = 'FROM logs-* | WHERE log.level == "error" | LIMIT 100';
    const { rerender } = renderInline({ version: 1 });

    expect(screen.getByTestId('mockedSearchEmbeddable')).toHaveAttribute(
      'data-query',
      'FROM logs-* | LIMIT 100'
    );
    expect(embeddableMounts).toBe(1);

    await user.click(screen.getByRole('button', { name: 'change time' }));

    expect(embeddableMounts).toBe(1);

    rerender(
      inlineProps({
        version: 2,
        data: {
          ...sessionData,
          tabs: [
            {
              ...sessionData.tabs[0],
              data_source: {
                type: AS_CODE_ESQL_DATA_SOURCE_TYPE,
                query: updatedQuery,
              },
            },
          ],
        },
      }).element
    );

    expect(embeddableMounts).toBe(2);
    expect(screen.getByTestId('mockedSearchEmbeddable')).toHaveAttribute(
      'data-query',
      updatedQuery
    );
  });

  it('does not register a Save action button', async () => {
    const registerActionButtons = jest.fn();
    renderInline({ registerActionButtons });

    await waitFor(() => {
      expect(screen.getByTestId('saveDiscoverTableToDashboardButton')).toBeInTheDocument();
    });

    const actionButtons = registerActionButtons.mock.calls.at(-1)?.[0] as ActionButton[];
    expect(actionButtons.find((button) => button.icon === 'save')).toBeUndefined();
    expect(actionButtons.find((button) => button.icon === 'discoverApp')).toBeDefined();
  });

  it('does not render the toolbar save control until the embeddable API is available', () => {
    exposeApi = false;
    renderInline();

    expect(screen.queryByTestId('saveDiscoverTableToDashboardButton')).not.toBeInTheDocument();
  });

  it('opens the save modal and transfers live table state without a time range', async () => {
    const user = userEvent.setup();
    renderInline();

    await user.click(await screen.findByTestId('saveDiscoverTableToDashboardButton'));

    expect(await screen.findByTestId('discoverAgentBuilderSaveModal')).toBeInTheDocument();

    await act(async () => {
      await capturedOnSave?.({
        dashboardId: 'dash-1',
        newTitle: 'Saved from chat',
        newDescription: 'Visible columns',
      });
    });

    expect(navigateToWithEmbeddablePackages).toHaveBeenCalledWith('dashboards', {
      path: '#/view/dash-1',
      state: [
        {
          type: SEARCH_EMBEDDABLE_TYPE,
          serializedState: {
            title: 'Saved from chat',
            description: 'Visible columns',
            tabs: [
              {
                data_source: {
                  type: AS_CODE_ESQL_DATA_SOURCE_TYPE,
                  query: 'FROM logs-* | LIMIT 100',
                },
                type: DiscoverTabType.Default,
                column_order: ['event.action', '@timestamp'],
                density: 'compact',
                row_height: 2,
                sort: [],
              },
            ],
          },
        },
      ],
    });
  });

  it('disables saving without dashboard write permissions', async () => {
    renderInline({ canWriteDashboards: false });

    const saveButton = await screen.findByTestId('saveDiscoverTableToDashboardButton');
    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveAttribute(
      'aria-label',
      'Save table to dashboard. You need dashboard write permissions to save tables to a dashboard.'
    );
    expect(screen.queryByTestId('discoverAgentBuilderSaveModal')).not.toBeInTheDocument();
  });

  it('prefills the save modal with the session description', async () => {
    const user = userEvent.setup();
    renderInline({
      data: { ...sessionData, description: 'Chat table description' },
    });

    await user.click(await screen.findByTestId('saveDiscoverTableToDashboardButton'));

    expect(await screen.findByTestId('discoverAgentBuilderSaveModal')).toBeInTheDocument();
    expect(capturedSaveModalDocumentInfo).toEqual({
      title: 'Nginx errors',
      description: 'Chat table description',
    });
  });

  it('clears action buttons on unmount', () => {
    const registerActionButtons = jest.fn();
    const { unmount } = render(
      <EuiProvider>
        <DiscoverSessionInline
          data={sessionData}
          unifiedSearch={{ ui: { SearchBar } } as unknown as UnifiedSearchPublicPluginStart}
          registerActionButtons={registerActionButtons}
        />
      </EuiProvider>
    );

    unmount();
    expect(registerActionButtons).toHaveBeenLastCalledWith([]);
  });
});
