/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  type ComponentProps,
  createElement,
  type ForwardedRef,
  type ReactNode,
} from 'react';
import { render, screen } from '@testing-library/react';
import type { AggregateQuery } from '@kbn/es-query';
import { dataViewWithTimefieldMock } from '../../../../../__mocks__/data_view_with_timefield';
import { CascadedDocumentsProvider } from './cascaded_documents_provider';
import type { CascadedDocumentsContext } from './cascaded_documents_provider';
import { CascadedDocumentsLayout } from './cascaded_document_layout';
import type { CascadedDocumentsFetcher } from '../../../data_fetching/cascaded_documents_fetcher';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { ESQLStatsQueryMeta } from '@kbn/esql-utils';
import type { DataCascade, DataCascadeImplRef } from '@kbn/shared-ux-document-data-cascade';
import type { ESQLDataGroupNode } from './blocks/types';

/** Captured DataCascade props we assert on in tests (includes provider props like initialTableState). */
const mockDataCascadeProps: Array<
  Pick<
    ComponentProps<typeof DataCascade<ESQLDataGroupNode, DataTableRecord>>,
    'initialAnchorItemIndex' | 'initialTableState' | 'initialRect'
  >
> = [];

const mockGetUISnapshotStore = jest.fn().mockReturnValue(null);

const mockDataCascadeRefObject = { getUISnapshotStore: mockGetUISnapshotStore };

jest.mock('@kbn/shared-ux-document-data-cascade', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ReactLib = require('react');
  const actual = jest.requireActual('@kbn/shared-ux-document-data-cascade');
  const MockDataCascade = ReactLib.forwardRef(function MockDataCascade(
    props: ComponentProps<typeof DataCascade<ESQLDataGroupNode, DataTableRecord>>,
    ref: ForwardedRef<DataCascadeImplRef<ESQLDataGroupNode, DataTableRecord>>
  ) {
    mockDataCascadeProps.push({
      initialAnchorItemIndex: props.initialAnchorItemIndex as number | undefined,
      initialTableState: props.initialTableState as
        | { expanded?: Record<string, boolean>; rowSelection?: Record<string, boolean> }
        | undefined,
      initialRect: props.initialRect as { width: number; height: number } | undefined,
    });
    ReactLib.useImperativeHandle(ref, () => mockDataCascadeRefObject, []);
    return ReactLib.createElement(
      'div',
      { 'data-testid': 'mock-data-cascade', 'data-test-subj': 'mock-data-cascade' },
      props.children
    );
  });
  return {
    ...actual,
    DataCascade: MockDataCascade,
    DataCascadeRow: ({ children }: { children?: unknown }) =>
      ReactLib.createElement('div', { 'data-testid': 'mock-data-cascade-row' }, children),
    DataCascadeRowCell: () =>
      ReactLib.createElement('div', { 'data-testid': 'mock-data-cascade-row-cell' }),
  };
});

jest.mock('@kbn/esql-utils', () => ({
  getESQLStatsQueryMeta: jest.fn(),
}));

jest.mock('@kbn/esql-utils/src/utils/cascaded_documents_helpers/utils', () => ({
  getStatsCommandToOperateOn: jest.fn().mockReturnValue(null),
}));

jest.mock('@kbn/esql-language', () => ({
  EsqlQuery: {
    fromSrc: jest.fn().mockReturnValue({}),
  },
}));

const mockGetESQLStatsQueryMeta = jest.requireMock('@kbn/esql-utils').getESQLStatsQueryMeta;

const defaultQueryMeta: ESQLStatsQueryMeta = {
  groupByFields: [{ field: 'category', type: 'column' }],
  appliedFunctions: [{ identifier: 'count', aggregation: 'count' }],
};

jest.mock('./blocks', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ReactLib = require('react');
  const actual = jest.requireActual('./blocks');
  return {
    ...actual,
    useEsqlDataCascadeRowHeaderComponents: jest.fn().mockReturnValue({
      rowActions: [],
      rowHeaderMeta: [],
      rowHeaderTitle: null,
    }),
    useEsqlDataCascadeHeaderComponent: jest.fn().mockReturnValue(null),
    ESQLDataCascadeLeafCell: function MockESQLDataCascadeLeafCell() {
      return ReactLib.createElement('div', { 'data-testid': 'mock-cascade-leaf-cell' });
    },
  };
});

jest.mock('./blocks/use_row_header_components', () => ({
  useEsqlDataCascadeRowActionHelpers: jest.fn().mockReturnValue({
    renderRowActionPopover: () => null,
    togglePopover: jest.fn(),
  }),
}));

const createMockFetcher = (): CascadedDocumentsFetcher =>
  ({
    fetchCascadedDocuments: jest.fn().mockResolvedValue([]),
    cancelFetch: jest.fn(),
  } as unknown as CascadedDocumentsFetcher);

const createWrapper = (overrides?: Partial<CascadedDocumentsContext>) => {
  const esqlQuery: AggregateQuery = { esql: 'FROM logs | STATS count() BY category' };

  const contextValue: CascadedDocumentsContext = {
    availableCascadeGroups: ['category'],
    selectedCascadeGroups: ['category'],
    cascadedDocumentsFetcher: createMockFetcher(),
    esqlQuery,
    esqlVariables: undefined,
    timeRange: undefined,
    viewModeToggle: undefined,
    getDataCascadeUiState: jest.fn(),
    getDataGridUiStateMap: jest.fn().mockReturnValue(undefined),
    setDataCascadeUiState: jest.fn(),
    setDataGridUiState: jest.fn(),
    cascadeGroupingChangeHandler: jest.fn(),
    onUpdateESQLQuery: jest.fn(),
    openInNewTab: jest.fn(),
    ...overrides,
  };

  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(CascadedDocumentsProvider, { value: contextValue }, children);

  return { Wrapper, contextValue };
};

const defaultRows: DataTableRecord[] = [
  {
    id: '0',
    raw: { category: 'A', count: 10 },
    flattened: { category: 'A', count: 10 },
  } as DataTableRecord,
  {
    id: '1',
    raw: { category: 'A', count: 5 },
    flattened: { category: 'A', count: 5 },
  } as DataTableRecord,
  {
    id: '2',
    raw: { category: 'B', count: 20 },
    flattened: { category: 'B', count: 20 },
  } as DataTableRecord,
];

const defaultLayoutProps = {
  dataView: dataViewWithTimefieldMock,
  rows: defaultRows,
  columns: [],
  showTimeCol: false,
};

describe('CascadedDocumentsLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDataCascadeProps.length = 0;
    mockGetESQLStatsQueryMeta.mockReturnValue(defaultQueryMeta);
  });

  describe('when persistedCascadeUiState does not exist (getDataCascadeUiState returns undefined)', () => {
    it('renders the layout and DataCascade without throwing', () => {
      const getDataCascadeUiState = jest.fn().mockReturnValue(undefined);
      const { Wrapper } = createWrapper({ getDataCascadeUiState });

      expect(() => {
        render(
          <Wrapper>
            <CascadedDocumentsLayout {...defaultLayoutProps} />
          </Wrapper>
        );
      }).not.toThrow();
    });

    it('renders the cascade wrapper and mock DataCascade', () => {
      const getDataCascadeUiState = jest.fn().mockReturnValue(undefined);
      const { Wrapper } = createWrapper({ getDataCascadeUiState });

      render(
        <Wrapper>
          <CascadedDocumentsLayout {...defaultLayoutProps} />
        </Wrapper>
      );

      expect(screen.getByTestId('mock-data-cascade')).toBeInTheDocument();
    });

    it('passes default initialAnchorItemIndex (0) to DataCascade when no persisted state', () => {
      const getDataCascadeUiState = jest.fn().mockReturnValue(undefined);
      const { Wrapper } = createWrapper({ getDataCascadeUiState });

      render(
        <Wrapper>
          <CascadedDocumentsLayout {...defaultLayoutProps} />
        </Wrapper>
      );

      expect(mockDataCascadeProps.length).toBeGreaterThanOrEqual(1);
      expect(mockDataCascadeProps[mockDataCascadeProps.length - 1].initialAnchorItemIndex).toBe(0);
    });

    it('passes initialTableState with undefined expanded and rowSelection when no persisted state', () => {
      const getDataCascadeUiState = jest.fn().mockReturnValue(undefined);
      const { Wrapper } = createWrapper({ getDataCascadeUiState });

      render(
        <Wrapper>
          <CascadedDocumentsLayout {...defaultLayoutProps} />
        </Wrapper>
      );

      expect(mockDataCascadeProps.length).toBeGreaterThanOrEqual(1);
      const lastProps = mockDataCascadeProps[mockDataCascadeProps.length - 1];
      expect(lastProps.initialTableState).toEqual({
        expanded: undefined,
        rowSelection: undefined,
      });
    });

    it('passes undefined initialRect to DataCascade when no persisted state', () => {
      const getDataCascadeUiState = jest.fn().mockReturnValue(undefined);
      const { Wrapper } = createWrapper({ getDataCascadeUiState });

      render(
        <Wrapper>
          <CascadedDocumentsLayout {...defaultLayoutProps} />
        </Wrapper>
      );

      expect(mockDataCascadeProps.length).toBeGreaterThanOrEqual(1);
      expect(mockDataCascadeProps[mockDataCascadeProps.length - 1].initialRect).toBeUndefined();
    });
  });

  describe('when persistedCascadeUiState exists', () => {
    it('passes persisted anchor index and rect to DataCascade', () => {
      const persistedState = {
        scrollAnchorItemIndex: 7,
        scrollRect: { width: 800, height: 600 },
        expanded: { 'row-1': true },
        rowSelection: {},
      };
      const getDataCascadeUiState = jest.fn().mockReturnValue(persistedState);
      const { Wrapper } = createWrapper({ getDataCascadeUiState });

      render(
        <Wrapper>
          <CascadedDocumentsLayout {...defaultLayoutProps} />
        </Wrapper>
      );

      expect(mockDataCascadeProps.length).toBeGreaterThanOrEqual(1);
      const lastProps = mockDataCascadeProps[mockDataCascadeProps.length - 1];
      expect(lastProps.initialAnchorItemIndex).toBe(7);
      expect(lastProps.initialRect).toEqual({ width: 800, height: 600 });
      expect(lastProps.initialTableState).toEqual(
        expect.objectContaining({
          rowSelection: {},
          expanded: { 'row-1': true },
        })
      );
    });
  });
});
