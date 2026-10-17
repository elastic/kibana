/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getCountSparkline, getESQLStatsQueryMeta } from '@kbn/esql-utils';
import type { DataTableRecord, RowControlComponent, RowControlRowProps } from '@kbn/discover-utils';
import { FetchStatus } from '../../../../types';
import {
  publishHistogramOverlayResult,
  selectTabRuntimeState,
} from '../../../state_management/redux';
import { DiscoverToolkitTestProvider } from '../../../../../__mocks__/test_provider';
import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import type { InternalStateMockToolkit } from '../../../../../__mocks__/discover_state.mock';
import {
  canCompareGridPatterns,
  getGridHistogramOverlayRowId,
  resolvePublishedGridHistogramOverlay,
  shouldForgetRequestedGridRow,
  useRegularGridPatternComparison,
} from './use_regular_grid_pattern_comparison';

const query =
  'FROM logs | STATS Sparkline = SPARKLINE(COUNT(*), @timestamp, 40, ?_tstart, ?_tend) BY Pattern = CATEGORIZE(message), host';
const timeRange = { from: '2020-01-01T00:00:00.000Z', to: '2020-01-02T00:00:00.000Z' };
const sparkline = getCountSparkline(query);
const queryMeta = getESQLStatsQueryMeta(query);

if (!sparkline) {
  throw new Error('Expected the test query to produce a count sparkline');
}

const record = (
  id: string,
  pattern: string,
  host: string,
  sparklineValues: unknown
): DataTableRecord =>
  ({
    id,
    raw: {},
    flattened: { Pattern: pattern, host, Sparkline: sparklineValues },
  } as DataTableRecord);

const timeoutOnA = record('positional-a', 'timeout', 'a', [1, 2, 3]);
const timeoutOnB = record('positional-b', 'timeout', 'b', [4, 5, 6]);
const nullPattern = record('null-pattern', 'unused', 'z', [1, 2, 3]);
nullPattern.flattened.Pattern = null;
const defaultRows = [timeoutOnA, timeoutOnB];

const rowProps = (row: DataTableRecord, rowIndex: number): RowControlRowProps => ({
  record: row,
  rowIndex,
});

const selectPatternTooltip = 'Select a pattern to compare its volume with total document volume.';
const unavailableStopTooltip = 'Pattern comparison is unavailable. Stop comparing pattern.';

const ButtonControl: RowControlComponent = ({
  label,
  tooltipContent,
  onClick,
  'data-test-subj': dataTestSubj,
}) => (
  <button
    type="button"
    aria-label={label}
    title={typeof tooltipContent === 'string' ? tooltipContent : undefined}
    data-test-subj={dataTestSubj}
    onClick={() => onClick?.(rowProps(timeoutOnA, 0))}
  />
);

describe('regular grid histogram overlay', () => {
  it('keeps rows with the same pattern distinct when another group differs', () => {
    expect(getGridHistogramOverlayRowId(timeoutOnA, queryMeta.groupByFields)).toBe(
      getGridHistogramOverlayRowId(timeoutOnA, queryMeta.groupByFields)
    );
    expect(getGridHistogramOverlayRowId(timeoutOnA, queryMeta.groupByFields)).not.toBe(
      getGridHistogramOverlayRowId(timeoutOnB, queryMeta.groupByFields)
    );
    expect(getGridHistogramOverlayRowId(timeoutOnA, queryMeta.groupByFields)).not.toBe(
      timeoutOnA.id
    );
  });

  it('publishes the fresh sparkline for the selected row and clears a row that disappeared', () => {
    const selectedRowId = getGridHistogramOverlayRowId(timeoutOnA, queryMeta.groupByFields);
    const published = resolvePublishedGridHistogramOverlay({
      fetchStatus: FetchStatus.PARTIAL,
      rowsQuery: query,
      currentQuery: query,
      rowsTimeRange: timeRange,
      rowsEsqlVariables: undefined,
      currentEsqlVariables: undefined,
      selectedRowId,
      selectedNodeId: selectedRowId,
      rows: [record('positional-a', 'timeout', 'a', [9, 8, 7]), timeoutOnB],
      groupByFields: queryMeta.groupByFields,
      categorizeField: 'Pattern',
      sparkline,
      timeRange,
    });

    expect(published).toEqual(
      expect.objectContaining({ nodeId: selectedRowId, label: 'timeout', values: [9, 8, 7] })
    );

    expect(
      resolvePublishedGridHistogramOverlay({
        fetchStatus: FetchStatus.PARTIAL,
        rowsQuery: query,
        currentQuery: query,
        rowsTimeRange: timeRange,
        rowsEsqlVariables: undefined,
        currentEsqlVariables: undefined,
        selectedRowId,
        selectedNodeId: selectedRowId,
        rows: [timeoutOnB],
        groupByFields: queryMeta.groupByFields,
        categorizeField: 'Pattern',
        sparkline,
        timeRange,
      })
    ).toBeUndefined();
  });

  it('preserves the series while loading or the rows still belong to another query, and clears on error', () => {
    const selectedRowId = getGridHistogramOverlayRowId(timeoutOnA, queryMeta.groupByFields);
    const base = {
      rowsQuery: query,
      currentQuery: query,
      rowsTimeRange: timeRange,
      rowsEsqlVariables: undefined,
      currentEsqlVariables: undefined,
      selectedRowId,
      selectedNodeId: selectedRowId,
      rows: [timeoutOnA],
      groupByFields: queryMeta.groupByFields,
      categorizeField: 'Pattern',
      sparkline,
      timeRange,
    };

    expect(
      resolvePublishedGridHistogramOverlay({ ...base, fetchStatus: FetchStatus.LOADING })
    ).toBe('preserve');
    expect(
      resolvePublishedGridHistogramOverlay({
        ...base,
        fetchStatus: FetchStatus.PARTIAL,
        rowsQuery: 'FROM logs | LIMIT 1',
      })
    ).toBe('preserve');
    expect(
      resolvePublishedGridHistogramOverlay({ ...base, fetchStatus: FetchStatus.ERROR })
    ).toBeUndefined();
    expect(
      resolvePublishedGridHistogramOverlay({
        ...base,
        fetchStatus: FetchStatus.LOADING,
        selectedNodeId: 'other-row',
      })
    ).toBeUndefined();
    expect(
      resolvePublishedGridHistogramOverlay({
        ...base,
        fetchStatus: FetchStatus.PARTIAL,
        rowsTimeRange: { ...timeRange, from: '2020-01-01T01:00:00.000Z' },
      })
    ).toBe('preserve');
    expect(
      resolvePublishedGridHistogramOverlay({
        ...base,
        fetchStatus: FetchStatus.PARTIAL,
        currentEsqlVariables: [],
      })
    ).toBe('preserve');
  });

  it('offers comparison only for one categorize field, one count sparkline, and the data view time field', () => {
    const compatible = {
      groupByFields: queryMeta.groupByFields,
      sparkline,
      timeFieldName: '@timestamp',
    };

    expect(canCompareGridPatterns(compatible)).toBe(true);
    expect(canCompareGridPatterns({ ...compatible, timeFieldName: 'event.ingested' })).toBe(false);
    expect(canCompareGridPatterns({ ...compatible, sparkline: undefined })).toBe(false);
    expect(
      canCompareGridPatterns({
        ...compatible,
        groupByFields: [
          { field: 'Pattern', type: 'categorize' },
          { field: 'Other', type: 'categorize' },
        ],
      })
    ).toBe(false);
  });

  it('forgets a requested row when the fetch fails or the finished rows cannot publish it', () => {
    expect(
      shouldForgetRequestedGridRow({
        fetchStatus: FetchStatus.ERROR,
        rowsQuery: query,
        currentQuery: query,
        publication: undefined,
      })
    ).toBe(true);
    expect(
      shouldForgetRequestedGridRow({
        fetchStatus: FetchStatus.PARTIAL,
        rowsQuery: query,
        currentQuery: query,
        publication: undefined,
      })
    ).toBe(true);
    expect(
      shouldForgetRequestedGridRow({
        fetchStatus: FetchStatus.LOADING,
        rowsQuery: query,
        currentQuery: query,
        publication: undefined,
      })
    ).toBe(false);
  });
});

describe('useRegularGridPatternComparison', () => {
  const setup = async () => {
    const toolkit = getDiscoverInternalStateMock({});
    await toolkit.initializeTabs();
    await toolkit.initializeSingleTab({
      tabId: toolkit.getCurrentTab().id,
      skipWaitForDataFetching: true,
    });
    return toolkit;
  };

  const selectionOf = (toolkit: InternalStateMockToolkit) =>
    selectTabRuntimeState(toolkit.runtimeStateManager, toolkit.getCurrentTab().id)
      .histogramOverlaySelection$;

  const Comparison = ({
    active = true,
    chartHidden = false,
    fetchStatus = FetchStatus.PARTIAL,
    rows = defaultRows,
    rowsQuery = query,
    timeFieldName = '@timestamp',
    appQuery = { esql: query },
    defaultHistogramAvailable = true,
  }: {
    active?: boolean;
    chartHidden?: boolean;
    fetchStatus?: FetchStatus;
    rows?: DataTableRecord[];
    rowsQuery?: string;
    timeFieldName?: string;
    appQuery?: { esql: string } | { language: string; query: string };
    defaultHistogramAvailable?: boolean;
  }) => {
    const comparison = useRegularGridPatternComparison({
      active,
      rows,
      query: appQuery,
      rowsQuery,
      fetchStatus,
      timeRange,
      rowsTimeRange: timeRange,
      currentEsqlVariables: undefined,
      rowsEsqlVariables: undefined,
      timeFieldName,
      chartHidden,
      defaultHistogramAvailable,
    });
    const [control] = comparison.rowAdditionalLeadingControls ?? [];
    const malformed = record('bad', 'timeout', 'c', ['n/a']);
    const renderControl = (row: DataTableRecord, rowIndex: number) =>
      control?.isAvailable?.(rowProps(row, rowIndex))
        ? control.render(ButtonControl, rowProps(row, rowIndex))
        : null;

    return (
      <>
        {comparison.publisher}
        {comparison.message}
        {rows.map((row, rowIndex) => (
          <React.Fragment key={row.id}>{renderControl(row, rowIndex)}</React.Fragment>
        ))}
        {renderControl(malformed, rows.length)}
      </>
    );
  };

  const Harness = ({
    toolkit,
    ...props
  }: { toolkit: InternalStateMockToolkit } & React.ComponentProps<typeof Comparison>) => (
    <DiscoverToolkitTestProvider toolkit={toolkit}>
      <Comparison {...props} />
    </DiscoverToolkitTestProvider>
  );

  it('toggles the selected row and publishes its sparkline without opening a document', async () => {
    const user = userEvent.setup();
    const toolkit = await setup();
    render(<Harness toolkit={toolkit} />);

    await user.click(screen.getAllByRole('button', { name: 'Compare pattern' })[0]);

    await waitFor(() => {
      expect(selectionOf(toolkit).getValue()).toEqual(
        expect.objectContaining({ label: 'timeout', values: [1, 2, 3] })
      );
    });
    expect(screen.getByRole('button', { name: 'Stop comparing pattern' })).toBeInTheDocument();
    expect(toolkit.getCurrentTab().expandedDoc).toBeUndefined();

    await user.click(screen.getByRole('button', { name: 'Stop comparing pattern' }));

    await waitFor(() => {
      expect(selectionOf(toolkit).getValue()).toBeUndefined();
    });
    expect(screen.queryByTestId('patternHistogramComparisonHint')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Compare pattern' })[0]).toHaveAttribute(
      'title',
      selectPatternTooltip
    );
  });

  it('keeps the published series while the same row stays selected during loading', async () => {
    const user = userEvent.setup();
    const toolkit = await setup();
    const { rerender } = render(<Harness toolkit={toolkit} />);

    await user.click(screen.getAllByRole('button', { name: 'Compare pattern' })[0]);
    await waitFor(() => {
      expect(selectionOf(toolkit).getValue()?.values).toEqual([1, 2, 3]);
    });

    rerender(<Harness toolkit={toolkit} fetchStatus={FetchStatus.LOADING} />);

    expect(selectionOf(toolkit).getValue()?.values).toEqual([1, 2, 3]);
  });

  it('hides the action and the message when comparison cannot be shown', async () => {
    const toolkit = await setup();
    const { rerender } = render(<Harness toolkit={toolkit} chartHidden />);

    expect(screen.queryByRole('button', { name: 'Compare pattern' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('patternHistogramComparisonHint')).not.toBeInTheDocument();

    rerender(<Harness toolkit={toolkit} timeFieldName="event.ingested" />);
    expect(screen.queryByRole('button', { name: 'Compare pattern' })).not.toBeInTheDocument();

    rerender(<Harness toolkit={toolkit} appQuery={{ language: 'kuery', query: '' }} />);
    expect(screen.queryByRole('button', { name: 'Compare pattern' })).not.toBeInTheDocument();

    rerender(<Harness toolkit={toolkit} active={false} />);
    expect(screen.queryByRole('button', { name: 'Compare pattern' })).not.toBeInTheDocument();
  });

  it('does not offer the action for a malformed sparkline and clears the series when cascade takes over', async () => {
    const user = userEvent.setup();
    const toolkit = await setup();
    const { rerender } = render(<Harness toolkit={toolkit} />);

    expect(screen.getAllByRole('button', { name: 'Compare pattern' })).toHaveLength(2);

    await user.click(screen.getAllByRole('button', { name: 'Compare pattern' })[0]);
    await waitFor(() => {
      expect(selectionOf(toolkit).getValue()).toBeDefined();
    });

    rerender(<Harness toolkit={toolkit} active={false} />);

    await waitFor(() => {
      expect(selectionOf(toolkit).getValue()).toBeUndefined();
    });
  });

  it('does not offer comparison when the histogram is replaced', async () => {
    const toolkit = await setup();
    render(<Harness toolkit={toolkit} defaultHistogramAvailable={false} />);

    expect(screen.queryByRole('button', { name: 'Compare pattern' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('patternHistogramComparisonHint')).not.toBeInTheDocument();
  });

  it('clears the request when the selected row disappears and does not republish it later', async () => {
    const user = userEvent.setup();
    const toolkit = await setup();
    const { rerender } = render(<Harness toolkit={toolkit} />);

    await user.click(screen.getAllByRole('button', { name: 'Compare pattern' })[0]);
    await waitFor(() => {
      expect(selectionOf(toolkit).getValue()?.values).toEqual([1, 2, 3]);
    });

    rerender(<Harness toolkit={toolkit} rows={[timeoutOnB]} />);

    await waitFor(() => {
      expect(selectionOf(toolkit).getValue()).toBeUndefined();
    });
    expect(screen.queryByTestId('patternHistogramComparisonHint')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compare pattern' })).toHaveAttribute(
      'title',
      selectPatternTooltip
    );
    expect(
      screen.queryByRole('button', { name: 'Stop comparing pattern' })
    ).not.toBeInTheDocument();

    rerender(<Harness toolkit={toolkit} rows={defaultRows} />);

    expect(selectionOf(toolkit).getValue()).toBeUndefined();
    expect(screen.getAllByRole('button', { name: 'Compare pattern' })).toHaveLength(2);
  });

  it('clears the request when the documents fetch fails', async () => {
    const user = userEvent.setup();
    const toolkit = await setup();
    const { rerender } = render(<Harness toolkit={toolkit} />);

    await user.click(screen.getAllByRole('button', { name: 'Compare pattern' })[0]);
    await waitFor(() => {
      expect(selectionOf(toolkit).getValue()).toBeDefined();
    });

    rerender(<Harness toolkit={toolkit} fetchStatus={FetchStatus.ERROR} />);

    await waitFor(() => {
      expect(selectionOf(toolkit).getValue()).toBeUndefined();
    });
    expect(screen.getAllByRole('button', { name: 'Compare pattern' })).toHaveLength(2);
    expect(screen.queryByTestId('patternHistogramComparisonHint')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Compare pattern' })[0]).toHaveAttribute(
      'title',
      selectPatternTooltip
    );
  });

  it('keeps a row chosen during loading and publishes it when the new rows arrive', async () => {
    const user = userEvent.setup();
    const toolkit = await setup();
    const { rerender } = render(<Harness toolkit={toolkit} />);

    await user.click(screen.getAllByRole('button', { name: 'Compare pattern' })[0]);
    await waitFor(() => {
      expect(selectionOf(toolkit).getValue()?.values).toEqual([1, 2, 3]);
    });

    rerender(<Harness toolkit={toolkit} fetchStatus={FetchStatus.LOADING} />);
    await user.click(screen.getAllByRole('button', { name: 'Compare pattern' })[0]);

    await waitFor(() => {
      expect(selectionOf(toolkit).getValue()).toBeUndefined();
    });
    expect(screen.getByRole('button', { name: 'Stop comparing pattern' })).toBeInTheDocument();

    rerender(<Harness toolkit={toolkit} fetchStatus={FetchStatus.PARTIAL} />);

    await waitFor(() => {
      expect(selectionOf(toolkit).getValue()?.values).toEqual([4, 5, 6]);
    });
  });

  it('shows the approximate toolbar message only after the selected comparison is applied', async () => {
    const user = userEvent.setup();
    const toolkit = await setup();
    render(<Harness toolkit={toolkit} />);

    expect(screen.queryByTestId('patternHistogramApproximate')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Compare pattern' })[0]).toHaveAttribute(
      'title',
      selectPatternTooltip
    );

    await user.click(screen.getAllByRole('button', { name: 'Compare pattern' })[0]);

    const selectedButton = await screen.findByRole('button', { name: 'Stop comparing pattern' });
    expect(selectedButton).toBeEnabled();
    expect(selectedButton).toHaveAttribute('title', 'Stop comparing pattern');
    expect(screen.queryByTestId('patternHistogramApproximate')).not.toBeInTheDocument();

    const selection = selectionOf(toolkit).getValue();
    act(() => {
      publishHistogramOverlayResult(toolkit.runtimeStateManager, toolkit.getCurrentTab().id, {
        key: selection?.key ?? '',
        applied: true,
        approximate: true,
      });
    });

    expect(await screen.findByTestId('patternHistogramApproximate')).toBeInTheDocument();
    expect(selectedButton).toHaveAttribute(
      'title',
      'Pattern comparison is approximate. Stop comparing pattern.'
    );
    expect(screen.queryByTestId('patternHistogramComparisonUnavailable')).not.toBeInTheDocument();
  });

  it('keeps an unavailable comparison actionable through the selected button tooltip', async () => {
    const user = userEvent.setup();
    const toolkit = await setup();
    render(<Harness toolkit={toolkit} />);

    await user.click(screen.getAllByRole('button', { name: 'Compare pattern' })[0]);
    const selection = await waitFor(() => {
      const value = selectionOf(toolkit).getValue();
      expect(value?.key).toEqual(expect.any(String));
      return value;
    });

    act(() => {
      publishHistogramOverlayResult(toolkit.runtimeStateManager, toolkit.getCurrentTab().id, {
        key: selection?.key ?? '',
        applied: false,
        approximate: false,
      });
    });

    const selectedButton = await screen.findByRole('button', { name: 'Stop comparing pattern' });
    expect(selectedButton).toBeEnabled();
    expect(selectedButton).toHaveAttribute('title', unavailableStopTooltip);
    expect(screen.queryByTestId('patternHistogramComparisonUnavailable')).not.toBeInTheDocument();
    expect(screen.queryByTestId('patternHistogramApproximate')).not.toBeInTheDocument();
  });

  it('clears the requested row when switching tabs', async () => {
    const user = userEvent.setup();
    const toolkit = await setup();
    const firstTab = toolkit.getCurrentTab();
    render(<Harness toolkit={toolkit} />);

    await user.click(screen.getAllByRole('button', { name: 'Compare pattern' })[0]);
    await waitFor(() => {
      expect(selectionOf(toolkit).getValue()).toBeDefined();
    });

    await act(async () => {
      await toolkit.addNewTab({
        tab: {
          ...firstTab,
          id: 'second-tab',
          label: 'Second tab',
        },
      });
    });

    expect(
      screen.queryByRole('button', { name: 'Stop comparing pattern' })
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Compare pattern' })).toHaveLength(2);
    expect(selectionOf(toolkit).getValue()).toBeUndefined();

    await act(async () => {
      await toolkit.switchToTab({ tabId: firstTab.id });
    });

    expect(
      screen.queryByRole('button', { name: 'Stop comparing pattern' })
    ).not.toBeInTheDocument();
    expect(selectionOf(toolkit).getValue()).toBeUndefined();
  });

  it('does not offer comparison for a null pattern label', async () => {
    const toolkit = await setup();
    render(<Harness toolkit={toolkit} rows={[nullPattern, timeoutOnA]} />);

    expect(screen.getAllByRole('button', { name: 'Compare pattern' })).toHaveLength(1);
  });
});
