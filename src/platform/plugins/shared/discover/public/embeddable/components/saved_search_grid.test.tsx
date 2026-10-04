/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockDiscoverGrid = jest.fn<void, [Record<string, unknown>]>();

jest.mock('../../components/discover_grid', () => ({
  DiscoverGrid: (props: Record<string, unknown>) => {
    mockDiscoverGrid(props);
    return null;
  },
}));

jest.mock('../../context_awareness', () => ({
  useProfileAccessor: jest.fn(
    () =>
      (fallback: (...args: unknown[]) => unknown) =>
      (...args: unknown[]) =>
        fallback(...args)
  ),
}));

import React from 'react';
import { render } from '@testing-library/react';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { DocViewerApi } from '@kbn/unified-doc-viewer';
import { DataLoadingState, type UnifiedDataTableProps } from '@kbn/unified-data-table';
import { DiscoverGridEmbeddable } from './saved_search_grid';

const services = {
  storage: { get: jest.fn() },
  uiSettings: { get: jest.fn() },
} as unknown as UnifiedDataTableProps['services'];

const baseProps: React.ComponentProps<typeof DiscoverGridEmbeddable> = {
  ariaLabelledBy: 'documentsAriaLabel',
  dataView: dataViewMock,
  rows: [],
  columns: [],
  sort: [],
  isPlainRecord: false,
  isSortEnabled: true,
  isPaginationEnabled: true,
  loadingState: DataLoadingState.loaded,
  onFilter: jest.fn(),
  onSetColumns: jest.fn(),
  showTimeCol: true,
  maxDocFieldsDisplayed: 50,
  services,
  totalHits: 0,
  totalHitCount: 0,
  sampleSizeState: 500,
  onUpdateSampleSize: jest.fn(),
  query: undefined,
  filters: undefined,
  onAddColumn: jest.fn(),
  onRemoveColumn: jest.fn(),
  enableDocumentViewer: true,
  inlineEditing: {
    isActive: false,
    hasPendingChanges: false,
    onApply: jest.fn(),
    onCancel: jest.fn(),
  },
  expandedDoc: undefined,
  initialDocViewerTabId: undefined,
  docViewerRef: React.createRef<DocViewerApi>(),
  isInteractive: true,
};

describe('DiscoverGridEmbeddable renderCustomToolbar', () => {
  beforeEach(() => {
    mockDiscoverGrid.mockClear();
  });

  it('passes a renderCustomToolbar function to DiscoverGrid when interactive', () => {
    render(<DiscoverGridEmbeddable {...baseProps} isInteractive={true} />);
    const lastProps = mockDiscoverGrid.mock.calls.at(-1)?.[0];
    expect(typeof lastProps?.renderCustomToolbar).toBe('function');
  });

  it('omits renderCustomToolbar from DiscoverGrid when not interactive', () => {
    render(<DiscoverGridEmbeddable {...baseProps} isInteractive={false} />);
    const lastProps = mockDiscoverGrid.mock.calls.at(-1)?.[0];
    expect(lastProps?.renderCustomToolbar).toBeUndefined();
  });
});
