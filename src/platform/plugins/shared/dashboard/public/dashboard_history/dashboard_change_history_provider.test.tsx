/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import type {
  ChangeHistoryAdapter,
  ChangeHistoryDetail,
  ChangeHistoryListItem,
} from '@kbn/change-history-ui';
import { ChangeHistoryTrigger } from '@kbn/change-history-ui';
import { TestProvider } from '@kbn/change-history-ui/mocks';

import { DashboardChangeHistoryProvider } from './dashboard_change_history_provider';

/** the shared Monaco diff is replaced with a stand-in that exposes which versions are compared */
jest.mock('@kbn/change-history-ui', () => ({
  ...jest.requireActual('@kbn/change-history-ui'),
  ChangeHistoryPreview: ({
    compareSpec,
  }: {
    compareSpec: { comparisonType: string; baseline: { id: string }; target: { id: string } };
  }) => (
    <div
      data-test-subj="jsonComparison"
      data-comparison-type={compareSpec.comparisonType}
      data-baseline={compareSpec.baseline.id}
      data-target={compareSpec.target.id}
    />
  ),
}));

/** the rendered dashboard preview is replaced with a stand-in that reports the selected version */
jest.mock('./dashboard_preview', () => ({
  DashboardPreview: ({ change }: { change: { id: string } }) => (
    <div data-test-subj="dashboardPreview" data-change-id={change.id} />
  ),
}));

const mockAdapter: { current?: ChangeHistoryAdapter } = {};
jest.mock('./dashboard_change_history_adapter', () => ({
  createDashboardChangeHistoryAdapter: () => mockAdapter.current,
}));

jest.mock('../services/kibana_services', () => ({
  coreServices: { analytics: { reportEvent: jest.fn() }, http: {} },
}));

jest.mock('../dashboard_api/use_dashboard_api', () => ({
  useDashboardApi: () => ({
    uuid: 'dash-uuid',
    isManaged: false,
    savedObjectId$: new BehaviorSubject<string | undefined>('dash-1'),
    title$: new BehaviorSubject<string | undefined>('Current title'),
    timeRange$: new BehaviorSubject(undefined),
    hasUnsavedChanges$: new BehaviorSubject(false),
  }),
}));

const listItems: ChangeHistoryListItem[] = [
  {
    id: 'v3',
    timestamp: '2026-01-03T00:00:00.000Z',
    actor: { name: 'Hannah' },
    action: 'dashboard_update',
    isCurrent: true,
    changes: { count: 3 },
    metadata: { version: 3 },
  },
  {
    id: 'v2',
    timestamp: '2026-01-02T00:00:00.000Z',
    actor: { name: 'Hannah' },
    action: 'dashboard_update',
    changes: { count: 2 },
    metadata: { version: 2 },
  },
  {
    id: 'v1',
    timestamp: '2026-01-01T00:00:00.000Z',
    actor: { name: 'Hannah' },
    action: 'dashboard_create',
    changes: { count: 5 },
    metadata: { version: 1 },
  },
];

const createAdapter = (): ChangeHistoryAdapter => ({
  listChanges: jest.fn().mockResolvedValue({ items: listItems, total: listItems.length }),
  getChange: jest.fn().mockImplementation(({ changeId }: { changeId: string }) => {
    const item = listItems.find(({ id }) => id === changeId);
    return Promise.resolve({
      ...item,
      snapshot: { title: `Title ${changeId}`, panels: [] },
    } as unknown as ChangeHistoryDetail);
  }),
});

const row = (id: string) => screen.getByTestId(`changeHistoryItem-${id}`);

const renderOpenModal = async () => {
  render(
    <DashboardChangeHistoryProvider>
      <ChangeHistoryTrigger />
    </DashboardChangeHistoryProvider>,
    { wrapper: TestProvider }
  );
  fireEvent.click(screen.getByTestId('changeHistoryTrigger'));
  // the newest row is auto-selected, which renders the dashboard preview
  await waitFor(() =>
    expect(screen.getByTestId('dashboardPreview')).toHaveAttribute('data-change-id', 'v3')
  );
};

const expectDashboardPreview = async (changeId: string) => {
  await waitFor(() =>
    expect(screen.getByTestId('dashboardPreview')).toHaveAttribute('data-change-id', changeId)
  );
  expect(screen.queryByTestId('jsonComparison')).not.toBeInTheDocument();
};

class IntersectionObserverMock {
  observe() {}
  disconnect() {}
  unobserve() {}
}

describe('DashboardChangeHistoryProvider', () => {
  beforeAll(() => {
    // the timeline uses it for infinite scrolling, and jsdom doesn't provide it
    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      configurable: true,
      value: IntersectionObserverMock,
    });
  });

  beforeEach(() => {
    mockAdapter.current = createAdapter();
  });

  describe('changes link', () => {
    it('selects the row and shows the JSON comparison against the previous version', async () => {
      await renderOpenModal();

      fireEvent.click(within(row('v2')).getByTestId('changeHistoryItemChanges'));

      await waitFor(() => expect(screen.getByTestId('jsonComparison')).toBeInTheDocument());
      expect(screen.getByTestId('jsonComparison')).toHaveAttribute(
        'data-comparison-type',
        'vs_previous'
      );
      expect(screen.getByTestId('jsonComparison')).toHaveAttribute('data-baseline', 'v1');
      expect(screen.getByTestId('jsonComparison')).toHaveAttribute('data-target', 'v2');
      expect(screen.queryByTestId('dashboardPreview')).not.toBeInTheDocument();
    });

    it('returns to the rendered preview when another row is selected', async () => {
      await renderOpenModal();
      fireEvent.click(within(row('v2')).getByTestId('changeHistoryItemChanges'));
      await waitFor(() => expect(screen.getByTestId('jsonComparison')).toBeInTheDocument());

      fireEvent.click(row('v3'));

      await expectDashboardPreview('v3');
    });

    it('returns to the rendered preview when the already-compared row is clicked again', async () => {
      await renderOpenModal();
      fireEvent.click(within(row('v2')).getByTestId('changeHistoryItemChanges'));
      await waitFor(() => expect(screen.getByTestId('jsonComparison')).toBeInTheDocument());

      fireEvent.click(row('v2'));

      await expectDashboardPreview('v2');
    });

    it('only suppresses the row selection for the changes click itself', async () => {
      await renderOpenModal();
      // compare, leave, then select a row normally: the stale "ignore" flag must not keep comparison on
      fireEvent.click(within(row('v2')).getByTestId('changeHistoryItemChanges'));
      await waitFor(() => expect(screen.getByTestId('jsonComparison')).toBeInTheDocument());
      fireEvent.click(row('v3'));
      await expectDashboardPreview('v3');

      fireEvent.click(row('v2'));

      await expectDashboardPreview('v2');
    });

    it('does not let the row key handler swallow the keyboard activation of the button', async () => {
      await renderOpenModal();

      const wasNotPrevented = fireEvent.keyDown(
        within(row('v2')).getByTestId('changeHistoryItemChanges'),
        { key: 'Enter' }
      );

      expect(wasNotPrevented).toBe(true);
    });

    it('does not render version 1 changes as a link, since there is nothing to compare to', async () => {
      await renderOpenModal();

      expect(within(row('v1')).queryByTestId('changeHistoryItemChanges')).not.toBeInTheDocument();
      expect(row('v1')).toHaveTextContent('5 changes');
      expect(within(row('v2')).getByTestId('changeHistoryItemChanges')).toHaveTextContent(
        '2 changes'
      );
    });

    it('stays on the rendered preview when version 1 is selected', async () => {
      await renderOpenModal();

      fireEvent.click(row('v1'));

      await expectDashboardPreview('v1');
    });
  });

  describe('"Compare to this version" row action', () => {
    const compareToVersion = (id: string) => {
      // the actions menu is a sibling of the selectable row, inside the same item panel
      const item = row(id).parentElement?.parentElement as HTMLElement;
      fireEvent.click(within(item).getByTestId('changeHistoryRowActionsButton'));
      fireEvent.click(screen.getByTestId('changeHistoryCompareToThisVersion'));
    };

    it('shows the JSON comparison without going through the changes link', async () => {
      await renderOpenModal();

      compareToVersion('v1');

      await waitFor(() => expect(screen.getByTestId('jsonComparison')).toBeInTheDocument());
      expect(screen.getByTestId('jsonComparison')).toHaveAttribute(
        'data-comparison-type',
        'vs_row'
      );
      expect(screen.getByTestId('jsonComparison')).toHaveAttribute('data-baseline', 'v1');
      expect(screen.getByTestId('jsonComparison')).toHaveAttribute('data-target', 'v3');
      expect(screen.queryByTestId('dashboardPreview')).not.toBeInTheDocument();
    });

    it('returns to the rendered preview when a row is selected', async () => {
      await renderOpenModal();
      compareToVersion('v1');
      await waitFor(() => expect(screen.getByTestId('jsonComparison')).toBeInTheDocument());

      fireEvent.click(row('v2'));

      await expectDashboardPreview('v2');
    });
  });
});
