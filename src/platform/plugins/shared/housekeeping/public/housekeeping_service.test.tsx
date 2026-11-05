/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useContext } from 'react';
import { BehaviorSubject } from 'rxjs';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import type { HousekeepingFindingsResponse } from '../common';
import { FindingsStore } from './findings_store';
import { createHousekeepingService } from './housekeeping_service';
import { OpenInConsoleContext } from './metadata';

const response: HousekeepingFindingsResponse = {
  kinds: [],
  groups: [],
  summary: { broken_reference: 0, deprecation: 0, risk: 0, unused: 0 },
  skipped: [],
  resourceTypes: {},
};

describe('useFindings', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads once per scope, even when the scope is written inline', async () => {
    const core = coreMock.createStart();
    core.http.get.mockResolvedValue(response);
    const load = jest.spyOn(FindingsStore.prototype, 'load');
    const { useFindings } = createHousekeepingService(core);

    const { result, rerender } = renderHook(
      ({ types }: { types: string[] }) => useFindings({ resourceTypes: types }),
      { initialProps: { types: ['index'] } }
    );
    await waitFor(() => expect(result.current.state.response).toBe(response));
    const loaded = result.current.state;

    rerender({ types: ['index'] });
    expect(result.current.state).toBe(loaded);
    expect(load).toHaveBeenCalledTimes(1);

    rerender({ types: ['data_stream'] });
    await waitFor(() => expect(core.http.get).toHaveBeenCalledTimes(2));
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe('openHousekeepingFlyout', () => {
  it('stays open in the tabs of the plugin that opened it, and closes in another plugin', async () => {
    const core = coreMock.createStart();
    core.http.get.mockResolvedValue(response);
    const location$ = new BehaviorSubject('/app/management/data/index_management/indices');
    core.application.currentLocation$ = location$;
    const { start } = createHousekeepingService(core);

    act(() => start.openHousekeepingFlyout({ resourceTypes: ['index'] }));
    expect(await screen.findByTestId('housekeepingFlyout')).toBeInTheDocument();

    act(() => location$.next('/app/management/data/index_management/templates'));
    expect(screen.getByTestId('housekeepingFlyout')).toBeInTheDocument();

    act(() => location$.next('/app/discover'));
    await waitFor(() => expect(screen.queryByTestId('housekeepingFlyout')).not.toBeInTheDocument());
  });
});

describe('Open in Console', () => {
  const OpenInConsoleButton = () => {
    const consoleActions = useContext(OpenInConsoleContext);
    return (
      <button onClick={() => consoleActions?.open('GET _cat/indices')}>
        {consoleActions?.opensInNewTab() ? 'new tab' : 'embedded'}
      </button>
    );
  };

  const setup = (isEmbeddedConsoleAvailable: boolean) => {
    const core = coreMock.createStart();
    core.application.capabilities = { ...core.application.capabilities, dev_tools: { show: true } };
    const share = sharePluginMock.createStartContract();
    const locator = sharePluginMock.createLocator();
    locator.getRedirectUrl.mockReturnValue('/app/dev_tools#/console');
    jest.spyOn(share.url.locators, 'get').mockReturnValue(locator);
    const consolePlugin = {
      isEmbeddedConsoleAvailable: () => isEmbeddedConsoleAvailable,
      openEmbeddedConsole: jest.fn(),
    };
    const { LinksProvider } = createHousekeepingService(core, share, consolePlugin);
    render(
      <LinksProvider>
        <OpenInConsoleButton />
      </LinksProvider>
    );
    return { consolePlugin };
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens Console in a new tab when the page has no embedded Console', () => {
    const open = jest.spyOn(window, 'open').mockReturnValue(null);
    const { consolePlugin } = setup(false);

    fireEvent.click(screen.getByText('new tab'));

    expect(open).toHaveBeenCalledWith('/app/dev_tools#/console', '_blank', 'noreferrer');
    expect(consolePlugin.openEmbeddedConsole).not.toHaveBeenCalled();
  });

  it('opens the embedded Console with the request when the page has it', () => {
    const open = jest.spyOn(window, 'open').mockReturnValue(null);
    const { consolePlugin } = setup(true);

    fireEvent.click(screen.getByText('embedded'));

    expect(consolePlugin.openEmbeddedConsole).toHaveBeenCalledWith('GET _cat/indices');
    expect(open).not.toHaveBeenCalled();
  });
});

describe('getAppMenuItem', () => {
  it('summarizes the last run of its scope in the tooltip', async () => {
    const core = coreMock.createStart();
    core.http.get.mockResolvedValue({
      ...response,
      summary: { broken_reference: 2, deprecation: 0, risk: 1, unused: 3 },
    });
    const { start, useFindings } = createHousekeepingService(core);
    const scope = { resourceTypes: ['index'] };
    const { tooltipContent } = start.getAppMenuItem(scope);
    const tooltip = () =>
      typeof tooltipContent === 'function' ? tooltipContent() : tooltipContent;
    expect(tooltip()).toBeUndefined();

    const { result } = renderHook(() => useFindings(scope));
    await waitFor(() => expect(result.current.state.response).toBeDefined());

    expect(tooltip()).toBe(
      'Last run: 2 broken references, 0 deprecations, 3 unused resources, 1 risks'
    );
  });
});
