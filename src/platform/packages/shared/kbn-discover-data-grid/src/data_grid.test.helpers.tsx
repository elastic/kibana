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
import { useTable } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';

import type { DataGridApi, DataGridCommandResult } from './data_grid_api';
import { DataGrid } from './data_grid';
import type { DataGridColumn } from './data_grid_column';
import { createDataGridColumnHelper } from './data_grid_column';

const ROW_HEIGHT = 40;
const VISIBLE_ROW_COUNT = 3;

const mockMeasureElement = jest.fn();
const mockGetOffsetForIndex = jest.fn();
const mockScrollToOffset = jest.fn();
let mockScrollOffsetAvailable = true;
let mockDelayVirtualMount = false;
let mockPendingVirtualScrolls: Array<() => void> = [];
let mockIsFocusVisible = true;
const nativeElementMatches = HTMLElement.prototype.matches;

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual<typeof import('@elastic/eui')>('@elastic/eui');
  const { dirname, join } = jest.requireActual<typeof import('path')>('path');
  // Kibana's EUI Jest build stubs tabular copy, so test against its browser implementation.
  const tabularCopy = jest.requireActual<typeof import('@elastic/eui')>(
    join(dirname(require.resolve('@elastic/eui/package.json')), 'lib/services/copy/tabular_copy')
  );
  return {
    ...actual,
    OverrideCopiedTabularContent: tabularCopy.OverrideCopiedTabularContent,
    tabularCopyMarkers: tabularCopy.tabularCopyMarkers,
  };
});

jest.mock('@tanstack/react-table', () => {
  const actual =
    jest.requireActual<typeof import('@tanstack/react-table')>('@tanstack/react-table');
  return {
    ...actual,
    useTable: jest.fn(actual.useTable),
  };
});

jest.mock('@tanstack/react-virtual', () => {
  const actual =
    jest.requireActual<typeof import('@tanstack/react-virtual')>('@tanstack/react-virtual');
  const react = jest.requireActual<typeof import('react')>('react');
  type VirtualizerOptions = Parameters<typeof actual.useVirtualizer>[0];

  return {
    ...actual,
    useVirtualizer: jest.fn((options: VirtualizerOptions) => {
      const [requestedStart, setRequestedStart] = react.useState(0);
      const maximumStart = Math.max(options.count - VISIBLE_ROW_COUNT, 0);
      const start = Math.min(requestedStart, maximumStart);
      const virtualItems = Array.from(
        { length: Math.min(VISIBLE_ROW_COUNT, options.count) },
        (_, offset) => {
          const index = start + offset;
          return {
            index,
            key: options.getItemKey?.(index) ?? index,
            start: index * ROW_HEIGHT,
            end: (index + 1) * ROW_HEIGHT,
            size: ROW_HEIGHT,
            lane: 0,
          };
        }
      );

      return {
        getTotalSize: () => options.count * ROW_HEIGHT,
        getVirtualItems: () => virtualItems,
        measureElement: mockMeasureElement,
        getOffsetForIndex: (index: number, align: string) => {
          mockGetOffsetForIndex(index, align);
          return mockScrollOffsetAvailable ? ([index * ROW_HEIGHT, align] as const) : undefined;
        },
        scrollToOffset: (offset: number) => {
          mockScrollToOffset(offset);
          const index = Math.floor(offset / ROW_HEIGHT);
          const commitScroll = () => setRequestedStart(Math.min(Math.max(index, 0), maximumStart));
          if (mockDelayVirtualMount) {
            mockPendingVirtualScrolls.push(commitScroll);
          } else {
            commitScroll();
          }
        },
      };
    }),
  };
});

export const mockUseTable = jest.mocked(useTable);
export const mockUseVirtualizer = jest.mocked(useVirtualizer);

export const focusVisibleTestHarness = {
  set: (isFocusVisible: boolean): void => {
    mockIsFocusVisible = isFocusVisible;
  },
  reset: (): void => {
    mockIsFocusVisible = true;
    jest
      .spyOn(HTMLElement.prototype, 'matches')
      .mockImplementation(function matches(this: HTMLElement, selectors: string): boolean {
        return selectors === ':focus-visible'
          ? mockIsFocusVisible
          : nativeElementMatches.call(this, selectors);
      });
  },
};

export const virtualizerTestHarness = {
  measureElement: mockMeasureElement,
  getOffsetForIndex: mockGetOffsetForIndex,
  scrollToOffset: mockScrollToOffset,
  reset: (): void => {
    mockMeasureElement.mockReset();
    mockGetOffsetForIndex.mockReset();
    mockScrollToOffset.mockReset();
    mockScrollOffsetAvailable = true;
    mockDelayVirtualMount = false;
    mockPendingVirtualScrolls = [];
  },
  delayMounts: (): void => {
    mockDelayVirtualMount = true;
  },
  failOffsetLookup: (): void => {
    mockScrollOffsetAvailable = false;
  },
  allowOffsetLookup: (): void => {
    mockScrollOffsetAvailable = true;
  },
  throwOnNextScroll: (): void => {
    mockScrollToOffset.mockImplementationOnce(() => {
      throw new Error('virtualizer unavailable');
    });
  },
  get pendingScrollCount(): number {
    return mockPendingVirtualScrolls.length;
  },
  flushScroll: (requestIndex: number): void => {
    const commitScroll = mockPendingVirtualScrolls[requestIndex];
    if (!commitScroll) {
      throw new Error(`Expected pending virtual scroll ${requestIndex}.`);
    }
    act(() => commitScroll());
  },
};

export interface TestRow {
  id: string;
  name: string;
  value: number;
}

const columnHelper = createDataGridColumnHelper<TestRow>();
export const columns = [
  columnHelper.accessor({
    id: 'name',
    header: 'Name',
    getValue: (row) => row.name,
    getTextValue: ({ value }) => value,
    renderCell: ({ value }) => value,
  }),
  columnHelper.accessor({
    id: 'value',
    header: 'Value',
    getValue: (row) => row.value,
    getTextValue: ({ value }) => value.toLocaleString(),
    renderCell: ({ value }) => value.toLocaleString(),
  }),
];
export const columnsWithAriaLabel = [
  columnHelper.accessor({
    id: 'name',
    header: 'Name',
    ariaLabel: 'Full name',
    getValue: (row) => row.name,
    getTextValue: ({ value }) => value,
    renderCell: ({ value }) => value,
  }),
];
export const rows = Array.from({ length: 100 }, (_, index) => ({
  id: `row-${index}`,
  name: `Name ${index}`,
  value: index,
}));
export const getRowId = (row: TestRow): string => row.id;

export interface TestDataGridProps {
  readonly gridRows?: readonly TestRow[];
  readonly gridColumns?: ReadonlyArray<DataGridColumn<TestRow>>;
  readonly apiRef?: React.RefObject<DataGridApi | null>;
  readonly ariaLabel?: string;
}

export const TestDataGrid = ({
  gridRows = rows,
  gridColumns = columns,
  apiRef,
  ariaLabel = 'Example data',
}: TestDataGridProps): React.ReactElement => (
  <DataGrid
    ariaLabel={ariaLabel}
    columns={gridColumns}
    rows={gridRows}
    getRowId={getRowId}
    height={160}
    apiRef={apiRef}
    virtualization={{
      rows: {
        estimatedHeight: ROW_HEIGHT,
        overscan: 2,
      },
    }}
  />
);

export const renderGrid = (props: TestDataGridProps = {}) => render(<TestDataGrid {...props} />);

export const expectFocus = async (accessibleName: string): Promise<HTMLElement> => {
  const cell = await screen.findByRole('gridcell', { name: accessibleName });
  await waitFor(() => expect(document.activeElement).toBe(cell));
  return cell;
};

export const focusElement = (element: HTMLElement): void => {
  act(() => element.focus());
};

export const runFocusCommand = async (
  api: DataGridApi,
  rowId: string,
  columnId: string
): Promise<DataGridCommandResult> => {
  let command: Promise<DataGridCommandResult> | undefined;
  act(() => {
    command = api.focusCell({ rowId, columnId });
  });
  if (!command) {
    throw new Error('Expected the focus command to start.');
  }
  return command;
};

export const resetDataGridTestState = (): void => {
  jest.clearAllMocks();
  focusVisibleTestHarness.reset();
  virtualizerTestHarness.reset();
};

export const cleanupDataGridTestState = (): void => {
  window.getSelection()?.removeAllRanges();
  jest.restoreAllMocks();
};
