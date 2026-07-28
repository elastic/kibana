/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { initializeDrilldownsManager } from '@kbn/embeddable-plugin/public/drilldowns/drilldowns_manager';
import type { ExpressionRendererParams } from '@kbn/expressions-plugin/public';
import { openLazyFlyout } from '@kbn/presentation-util';
import { BehaviorSubject } from 'rxjs';
import { ON_APPLY_FILTER, ON_OPEN_PANEL_MENU } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { VEGA_EMBEDDABLE_TYPE, VEGA_EVENT_APPLY_FILTER } from '../constants';
import { vegaEmbeddableFactory } from './vega_embeddable';

jest.mock('@kbn/presentation-util', () => ({ openLazyFlyout: jest.fn() }));

const mockOpenLazyFlyout = jest.mocked(openLazyFlyout);

describe('vegaEmbeddableFactory', () => {
  const query$ = new BehaviorSubject({ language: 'kuery', query: '' });
  const filters$ = new BehaviorSubject([]);
  const timeRange$ = new BehaviorSubject({ from: 'now-15m', to: 'now', mode: 'relative' as const });
  const reload$ = new BehaviorSubject<void>(undefined);
  const removePanel = jest.fn();
  const parentApi = {
    addNewPanel: jest.fn(),
    children$: new BehaviorSubject({}),
    filters$,
    query$,
    reload$,
    removePanel,
    replacePanel: jest.fn(),
    timeRange$,
  };
  const executeTriggerActions = jest.fn();
  let latestRendererParams: ExpressionRendererParams | undefined;

  const buildEmbeddable = async () => {
    latestRendererParams = undefined;
    const factory = vegaEmbeddableFactory(coreMock.createStart(), {
      expressions: {
        ReactExpressionRenderer: (params: ExpressionRendererParams): null => {
          latestRendererParams = params;
          return null;
        },
      },
      uiActions: { executeTriggerActions },
    });
    const uuid = 'vega-panel';

    return factory.buildEmbeddable({
      initializeDrilldownsManager,
      initialState: { spec: '{ mark: point }', title: 'Initial title' },
      finalizeApi: (api) => ({
        ...api,
        uuid,
        type: VEGA_EMBEDDABLE_TYPE,
        parentApi,
        phase$: new BehaviorSubject(undefined),
      }),
      parentApi,
      uuid,
    });
  };

  beforeEach(() => {
    query$.next({ language: 'kuery', query: '' });
    filters$.next([]);
    timeRange$.next({ from: 'now-15m', to: 'now', mode: 'relative' });
    executeTriggerActions.mockReset();
    mockOpenLazyFlyout.mockReset();
    removePanel.mockReset();
  });

  it('serializes and applies its state', async () => {
    const { api } = await buildEmbeddable();

    api.applySerializedState({
      spec: '{ mark: bar }',
      title: 'Updated title',
      time_range: {
        from: '2025-01-01T00:00:00.000Z',
        to: '2025-01-02T00:00:00.000Z',
        mode: 'absolute',
      },
    });

    expect(api.serializeState()).toEqual(
      expect.objectContaining({
        spec: '{ mark: bar }',
        title: 'Updated title',
        time_range: {
          from: '2025-01-01T00:00:00.000Z',
          to: '2025-01-02T00:00:00.000Z',
          mode: 'absolute',
        },
      })
    );
  });

  it('rerenders with refreshed Dashboard query, filters, and time range and cancels superseded requests', async () => {
    const { api, Component } = await buildEmbeddable();
    const view = render(<Component />);

    await waitFor(() => expect(latestRendererParams).toBeDefined());
    const initialAbortController = latestRendererParams?.abortController;
    query$.next({ language: 'kuery', query: 'response: 200' });

    await waitFor(() => {
      expect(latestRendererParams?.searchContext?.query).toEqual({
        language: 'kuery',
        query: 'response: 200',
      });
    });
    expect(initialAbortController?.signal.aborted).toBe(true);

    filters$.next([{ meta: { alias: 'status filter' }, query: { match: { status: 200 } } }]);
    await waitFor(() => {
      expect(latestRendererParams?.searchContext?.filters).toEqual([
        { meta: { alias: 'status filter' }, query: { match: { status: 200 } } },
      ]);
    });

    timeRange$.next({ from: 'now-1h', to: 'now', mode: 'relative' });
    await waitFor(() => {
      expect(latestRendererParams?.searchContext?.timeRange).toEqual({
        from: 'now-1h',
        to: 'now',
        mode: 'relative',
      });
    });

    view.unmount();
    expect(latestRendererParams?.abortController?.signal.aborted).toBe(true);
    expect(api.rendered$.getValue()).toBe(false);
  });

  it('routes filter events through ON_APPLY_FILTER', async () => {
    const { api, Component } = await buildEmbeddable();
    render(<Component />);

    await waitFor(() => expect(latestRendererParams).toBeDefined());
    await latestRendererParams?.onEvent?.({
      name: VEGA_EVENT_APPLY_FILTER,
      data: { filters: [{ meta: {}, query: { match_all: {} } }] },
    });
    expect(api.supportedTriggers()).toEqual([ON_APPLY_FILTER, ON_OPEN_PANEL_MENU]);
    expect(executeTriggerActions).toHaveBeenCalledWith(ON_APPLY_FILTER, {
      embeddable: api,
      filters: [{ meta: {}, query: { match_all: {} } }],
    });
  });

  it('exposes shared-item render metadata for Reporting', async () => {
    const { api, Component } = await buildEmbeddable();
    const { container } = render(<Component />);
    const sharedItem = container.querySelector('[data-shared-item]');
    const renderComplete = jest.fn();

    expect(sharedItem).toHaveAttribute('data-title', 'Initial title');
    expect(sharedItem).toHaveAttribute('data-description', '');
    expect(sharedItem).toHaveAttribute('data-render-complete', 'false');

    sharedItem?.addEventListener('renderComplete', renderComplete);

    await waitFor(() => expect(latestRendererParams).toBeDefined());
    await act(async () => {
      latestRendererParams?.onRender$?.(1);
    });

    await waitFor(() => {
      expect(api.rendered$.getValue()).toBe(true);
      expect(sharedItem).toHaveAttribute('data-render-complete', 'true');
      expect(renderComplete).toHaveBeenCalledTimes(1);
    });
  });

  it('gives the flyout the focus targets to restore when it closes', async () => {
    const { api } = await buildEmbeddable();
    const returnFocus = jest.fn();

    api.onEdit({ isNewPanel: true, returnFocus });
    expect(mockOpenLazyFlyout.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        returnFocus,
        flyoutProps: expect.objectContaining({ focusedPanelId: api.uuid }),
      })
    );
  });

  it('restores the original spec when editing is cancelled', async () => {
    const { api } = await buildEmbeddable();
    const closeFlyout = jest.fn();

    api.onEdit();
    const flyout = mockOpenLazyFlyout.mock.calls[0][0];
    const content = (await flyout.loadContent({
      ariaLabelledBy: 'vega-flyout-title',
      closeFlyout,
    })) as React.ReactElement<{
      onRevert: () => void;
      onPreview: (spec: string) => void;
    }>;

    content.props.onPreview('{ mark: bar }');
    expect(api.serializeState().spec).toBe('{ mark: bar }');
    content.props.onRevert();
    expect(api.serializeState().spec).toBe('{ mark: point }');
  });

  it('keeps the edited spec when saving', async () => {
    const { api } = await buildEmbeddable();
    const closeFlyout = jest.fn();

    api.onEdit();
    const flyout = mockOpenLazyFlyout.mock.calls[0][0];
    const content = (await flyout.loadContent({
      ariaLabelledBy: 'vega-flyout-title',
      closeFlyout,
    })) as React.ReactElement<{ onSave: (spec: string) => void }>;

    content.props.onSave('{ mark: bar }');

    expect(api.serializeState().spec).toBe('{ mark: bar }');
  });
});
