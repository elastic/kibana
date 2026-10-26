/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode } from 'react';
import { EuiErrorBoundary } from '@elastic/eui';
import { act, render, screen } from '@testing-library/react';
import { KibanaContentListPageActiveTab, type KibanaContentListPageTab } from './active_tab';

const loadingFallback = <div data-test-subj="loading">Loading</div>;

describe('KibanaContentListPageActiveTab', () => {
  it('renders synchronous active tab content without the loading fallback', () => {
    const renderActiveTab = jest.fn(() => <div data-test-subj="activeContent">Active</div>);
    const renderInactiveTab = jest.fn(() => <div data-test-subj="inactiveContent">Inactive</div>);
    const tabs: KibanaContentListPageTab[] = [
      { id: 'active', render: renderActiveTab },
      { id: 'inactive', render: renderInactiveTab },
    ];

    render(
      <KibanaContentListPageActiveTab
        tabs={tabs}
        activeTabId="active"
        loadingFallback={loadingFallback}
      />
    );

    expect(screen.getByTestId('activeContent')).toBeInTheDocument();
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('inactiveContent')).not.toBeInTheDocument();
    expect(renderActiveTab).toHaveBeenCalledTimes(1);
    expect(renderInactiveTab).not.toHaveBeenCalled();
  });

  it('renders the loading fallback while asynchronous content resolves', async () => {
    const { promise, resolve } = Promise.withResolvers<ReactNode>();
    const tabs: KibanaContentListPageTab[] = [{ id: 'async', load: () => promise }];

    render(
      <KibanaContentListPageActiveTab
        tabs={tabs}
        activeTabId="async"
        loadingFallback={loadingFallback}
      />
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();

    await act(async () => {
      resolve(<div data-test-subj="resolvedContent">Resolved</div>);
      await promise;
    });

    expect(screen.getByTestId('resolvedContent')).toBeInTheDocument();
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
  });

  it('does not reload while the active tab is re-rendered', async () => {
    const { promise, resolve } = Promise.withResolvers<ReactNode>();
    const load = jest.fn(() => promise);
    const tabs: KibanaContentListPageTab[] = [{ id: 'async', load }];

    const { rerender } = render(
      <KibanaContentListPageActiveTab
        tabs={tabs}
        activeTabId="async"
        loadingFallback={loadingFallback}
      />
    );

    rerender(
      <KibanaContentListPageActiveTab
        tabs={tabs}
        activeTabId="async"
        loadingFallback={loadingFallback}
      />
    );

    expect(load).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve(<div data-test-subj="resolvedContent">Resolved</div>);
      await promise;
    });
    expect(screen.getByTestId('resolvedContent')).toBeInTheDocument();
  });

  it('ignores content resolved by a previously active tab', async () => {
    const firstTabContent = Promise.withResolvers<ReactNode>();
    const secondTabContent = Promise.withResolvers<ReactNode>();
    const load = jest
      .fn((): Promise<ReactNode> => secondTabContent.promise)
      .mockReturnValueOnce(firstTabContent.promise);
    const tabs: KibanaContentListPageTab[] = [
      { id: 'first', load },
      { id: 'second', load },
    ];

    const { rerender } = render(
      <KibanaContentListPageActiveTab
        tabs={tabs}
        activeTabId="first"
        loadingFallback={loadingFallback}
      />
    );

    rerender(
      <KibanaContentListPageActiveTab
        tabs={tabs}
        activeTabId="second"
        loadingFallback={loadingFallback}
      />
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();

    await act(async () => {
      secondTabContent.resolve(<div data-test-subj="secondContent">Second</div>);
      await secondTabContent.promise;
    });

    expect(screen.getByTestId('secondContent')).toBeInTheDocument();

    await act(async () => {
      firstTabContent.resolve(<div data-test-subj="firstContent">First</div>);
      await firstTabContent.promise;
    });

    expect(screen.queryByTestId('firstContent')).not.toBeInTheDocument();
    expect(screen.getByTestId('secondContent')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('forwards load failures to the nearest error boundary', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const onError = jest.fn();
    const tabs: KibanaContentListPageTab[] = [
      { id: 'failing', load: () => Promise.reject('Tab failed to load') },
    ];
    try {
      render(
        <EuiErrorBoundary onError={onError}>
          <KibanaContentListPageActiveTab tabs={tabs} activeTabId="failing" />
        </EuiErrorBoundary>
      );
      expect(await screen.findByTestId('euiErrorBoundary')).toBeInTheDocument();
      const [[error]] = onError.mock.calls;
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Tab failed to load');
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
