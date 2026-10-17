/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { getCountSparkline, type ESQLStatsQueryMeta } from '@kbn/esql-utils';
import { FetchStatus } from '../../../../types';
import { createRuntimeStateManager } from '../../../state_management/redux/runtime_state';
import {
  publishHistogramOverlayResult,
  publishHistogramOverlaySelection,
} from '../../../state_management/redux/runtime_state';
import type { ESQLDataGroupNode } from './blocks/types';
import {
  buildHistogramOverlaySelection,
  resolveHistogramOverlayPublication,
} from './histogram_overlay_selection';

const query =
  'FROM logs | STATS Sparkline = SPARKLINE(COUNT(*), timestamp, 40, ?_tstart, ?_tend) BY Pattern = CATEGORIZE(message)';
const timeRange = { from: '2020-01-01T00:00:00.000Z', to: '2020-01-02T00:00:00.000Z' };
const queryMeta: ESQLStatsQueryMeta = {
  groupByFields: [{ field: 'Pattern', type: 'categorize' }],
  appliedFunctions: [],
};

const sparkline = getCountSparkline(query);
const node = (id: string, values: number[]): ESQLDataGroupNode => ({
  id,
  groupColumn: 'Pattern',
  groupValue: 'timeout',
  aggregatedValues: { Sparkline: values },
});

describe('buildHistogramOverlaySelection', () => {
  it('publishes the expanded categorize row even when the sparkline is shorter than the target', () => {
    const selection = buildHistogramOverlaySelection({
      expanded: { row: true },
      nodes: [node('row', [1, 0, 2])],
      query,
      timeRange,
      queryMeta,
      sparkline,
    });

    expect(selection?.values).toEqual([1, 0, 2]);
    expect(selection?.timeField).toBe('timestamp');
    expect(selection?.nodeId).toBe('row');
    expect(selection?.key).toContain('row');
  });

  it('clears the selection unless exactly one categorize row is expanded', () => {
    expect(
      buildHistogramOverlaySelection({
        expanded: { a: true, b: true },
        nodes: [node('a', [1]), node('b', [2])],
        query,
        timeRange,
        queryMeta,
        sparkline,
      })
    ).toBeUndefined();
    expect(
      buildHistogramOverlaySelection({
        expanded: {},
        nodes: [node('row', [1])],
        query,
        timeRange,
        queryMeta,
        sparkline,
      })
    ).toBeUndefined();
  });
});

describe('resolveHistogramOverlayPublication', () => {
  const expanded = { row: true };
  const selectedNodeId = 'row';

  it('keeps the current selection while rows from the previous request are still showing', () => {
    expect(
      resolveHistogramOverlayPublication({
        fetchStatus: FetchStatus.LOADING,
        rowsQuery: query,
        currentQuery: 'FROM logs | WHERE false',
        expanded,
        selectedNodeId,
      })
    ).toBe('preserve');
    expect(
      resolveHistogramOverlayPublication({
        fetchStatus: FetchStatus.UNINITIALIZED,
        rowsQuery: query,
        currentQuery: query,
        expanded,
        selectedNodeId,
      })
    ).toBe('preserve');
    expect(
      resolveHistogramOverlayPublication({
        fetchStatus: FetchStatus.LOADING_MORE,
        rowsQuery: query,
        currentQuery: query,
        expanded,
        selectedNodeId,
      })
    ).toBe('preserve');
  });

  it('clears when a different pattern is expanded during loading', () => {
    expect(
      resolveHistogramOverlayPublication({
        fetchStatus: FetchStatus.LOADING,
        rowsQuery: query,
        currentQuery: query,
        expanded: { next: true },
        selectedNodeId,
      })
    ).toBe('clear');
    expect(
      resolveHistogramOverlayPublication({
        fetchStatus: FetchStatus.LOADING,
        rowsQuery: query,
        currentQuery: query,
        expanded,
        selectedNodeId: undefined,
      })
    ).toBe('preserve');
  });

  it('publishes once the ES|QL rows match the current query', () => {
    expect(
      resolveHistogramOverlayPublication({
        fetchStatus: FetchStatus.PARTIAL,
        rowsQuery: query,
        currentQuery: query,
        expanded,
        selectedNodeId,
      })
    ).toBe('publish');
    expect(
      resolveHistogramOverlayPublication({
        fetchStatus: FetchStatus.COMPLETE,
        rowsQuery: query,
        currentQuery: query,
        expanded,
        selectedNodeId,
      })
    ).toBe('publish');
    expect(
      resolveHistogramOverlayPublication({
        fetchStatus: FetchStatus.PARTIAL,
        rowsQuery: 'FROM logs | WHERE false',
        currentQuery: query,
        expanded,
        selectedNodeId,
      })
    ).toBe('preserve');
  });

  it('clears on error and when the expanded row is gone, including during loading', () => {
    expect(
      resolveHistogramOverlayPublication({
        fetchStatus: FetchStatus.ERROR,
        rowsQuery: query,
        currentQuery: query,
        expanded,
        selectedNodeId,
      })
    ).toBe('clear');
    expect(
      resolveHistogramOverlayPublication({
        fetchStatus: FetchStatus.LOADING,
        rowsQuery: query,
        currentQuery: query,
        expanded: {},
        selectedNodeId,
      })
    ).toBe('clear');
    expect(
      resolveHistogramOverlayPublication({
        fetchStatus: FetchStatus.PARTIAL,
        rowsQuery: query,
        currentQuery: query,
        expanded: { a: true, b: true },
        selectedNodeId,
      })
    ).toBe('clear');
  });
});

describe('histogram overlay runtime', () => {
  it('ignores a result for a different key and a publish after the tab is gone', () => {
    const manager = createRuntimeStateManager();
    const tabId = 'tab';
    manager.tabs.byId[tabId] = {
      histogramOverlaySelection$: new BehaviorSubject(undefined),
      histogramOverlayResult$: new BehaviorSubject(undefined),
    } as unknown as (typeof manager.tabs.byId)[string];

    const selection = buildHistogramOverlaySelection({
      expanded: { row: true },
      nodes: [node('row', [1, 2])],
      query,
      timeRange,
      queryMeta,
      sparkline,
    });

    publishHistogramOverlaySelection(manager, tabId, selection);
    publishHistogramOverlayResult(manager, tabId, {
      key: 'stale',
      approximate: true,
      applied: true,
    });
    expect(manager.tabs.byId[tabId].histogramOverlayResult$.getValue()).toBeUndefined();

    publishHistogramOverlayResult(manager, tabId, {
      key: selection!.key,
      approximate: true,
      applied: true,
    });
    expect(manager.tabs.byId[tabId].histogramOverlayResult$.getValue()).toEqual({
      key: selection!.key,
      approximate: true,
      applied: true,
    });

    delete manager.tabs.byId[tabId];
    publishHistogramOverlaySelection(manager, tabId, undefined);
    publishHistogramOverlayResult(manager, tabId, {
      key: 'stale',
      approximate: true,
      applied: false,
    });
  });
});
