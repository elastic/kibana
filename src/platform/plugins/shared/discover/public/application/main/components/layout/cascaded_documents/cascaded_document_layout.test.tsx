/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import React, { type ComponentProps, type ForwardedRef, type ReactNode } from 'react';
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
import { DiscoverToolkitTestProvider } from '../../../../../__mocks__/test_provider';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import { BehaviorSubject } from 'rxjs';

/** Captured DataCascade props we assert on in tests. */
const mockDataCascadeProps: Array<
  Pick<ComponentProps<typeof DataCascade<ESQLDataGroupNode, DataTableRecord>>, 'initialState'>
> = [];

const mockGetUISnapshotStore = vi.fn().mockReturnValue(null);

const mockDataCascadeRefObject = { getUISnapshotStore: mockGetUISnapshotStore };

vi.mock('@kbn/shared-ux-document-data-cascade', async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ReactLib = require('react');
  const actual = (await vi.importActual('@kbn/shared-ux-document-data-cascade'));
  const MockDataCascade = ReactLib.forwardRef(function MockDataCascade(
    props: ComponentProps<typeof DataCascade<ESQLDataGroupNode, DataTableRecord>>,
    ref: ForwardedRef<DataCascadeImplRef<ESQLDataGroupNode, DataTableRecord>>
  ) {
    mockDataCascadeProps.push({
      initialState: props.initialState,
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

vi.mock('@kbn/esql-utils', () => {
      const mocked = {
      getESQLStatsQueryMeta: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/esql-utils/src/utils/cascaded_documents_helpers/utils', () => {
      const mocked = {
      getStatsCommandToOperateOn: vi.fn().mockReturnValue(null),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/esql-language', async () => {
  const { FunctionNames } = (await vi.importActual('@kbn/esql-language'));

  return {
    EsqlQuery: {
      fromSrc: vi.fn().mockReturnValue({}),
    },
    FunctionNames,
    // @kbn/monaco's Console ES|QL lexer reads this eagerly at module-load time to build its
    // keyword list, so it needs a stub here even though this suite doesn't exercise highlighting.
    esqlCommandRegistry: { getAllCommandNames: () => [] },
  };
});

const mockGetESQLStatsQueryMeta = (await vi.importMock('@kbn/esql-utils')).getESQLStatsQueryMeta;

const defaultQueryMeta: ESQLStatsQueryMeta = {
  groupByFields: [{ field: 'category', type: 'column' }],
  appliedFunctions: [{ identifier: 'count', aggregation: 'count' }],
};

vi.mock('./blocks', async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ReactLib = require('react');
  const actual = (await vi.importActual('./blocks'));
  return {
    ...actual,
    useEsqlDataCascadeRowHeaderComponents: vi.fn().mockReturnValue({
      rowActions: [],
      rowHeaderMeta: [],
      rowHeaderTitle: null,
    }),
    useEsqlDataCascadeHeaderComponent: vi.fn().mockReturnValue(null),
    ESQLDataCascadeLeafCell: function MockESQLDataCascadeLeafCell() {
      return ReactLib.createElement('div', { 'data-testid': 'mock-cascade-leaf-cell' });
    },
  };
});

vi.mock('./blocks/use_row_header_components', () => {
      const mocked = {
      useEsqlDataCascadeRowActionHelpers: vi.fn().mockReturnValue({
        renderRowActionPopover: () => null,
        togglePopover: vi.fn(),
      }),
    };
      return { ...mocked, default: mocked };
    });

const createMockFetcher = (): CascadedDocumentsFetcher =>
  ({
    fetchCascadedDocuments: vi.fn().mockResolvedValue([]),
    cancelFetch: vi.fn(),
  } as unknown as CascadedDocumentsFetcher);

const createWrapper = async (overrides?: Partial<CascadedDocumentsContext>) => {
  const esqlQuery: AggregateQuery = { esql: 'FROM logs | STATS count() BY category' };

  const contextValue: CascadedDocumentsContext = {
    availableCascadeGroups: ['category'],
    selectedCascadeGroups: ['category'],
    cascadedDocumentsFetcher: createMockFetcher(),
    cascadedColumnsMeta: {},
    esqlQuery,
    esqlVariables: undefined,
    timeRange: undefined,
    esqlApproximation: false,
    renderViewModeToggle: undefined,
    expandedDoc$: new BehaviorSubject<DataTableRecord | undefined>(undefined),
    expandedDocOwner$: new BehaviorSubject<string | undefined>(undefined),
    getExpandedDocSetter: vi.fn(),
    getRenderDocumentViewMetaSetter: vi.fn(),
    getDataCascadeUiState: vi.fn(),
    getDataGridUiStateMap: vi.fn().mockReturnValue(undefined),
    setDataCascadeUiState: vi.fn(),
    setDataGridUiState: vi.fn(),
    cascadeGroupingChangeHandler: vi.fn(),
    onUpdateESQLQuery: vi.fn(),
    openInNewTab: vi.fn(),
    ...overrides,
  };

  const services = createDiscoverServicesMock();
  const toolkit = getDiscoverInternalStateMock({ services });
  await toolkit.initializeTabs();
  await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <DiscoverToolkitTestProvider toolkit={toolkit}>
      <CascadedDocumentsProvider value={contextValue}>{children}</CascadedDocumentsProvider>
    </DiscoverToolkitTestProvider>
  );

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
    vi.clearAllMocks();
    mockDataCascadeProps.length = 0;
    mockGetESQLStatsQueryMeta.mockReturnValue(defaultQueryMeta);
  });

  describe('when persistedCascadeUiState does not exist (getDataCascadeUiState returns undefined)', () => {
    it('renders the layout and DataCascade without throwing', async () => {
      const getDataCascadeUiState = vi.fn().mockReturnValue(undefined);
      const { Wrapper } = await createWrapper({ getDataCascadeUiState });

      expect(() => {
        render(
          <Wrapper>
            <CascadedDocumentsLayout {...defaultLayoutProps} />
          </Wrapper>
        );
      }).not.toThrow();
    });

    it('renders the cascade wrapper and mock DataCascade', async () => {
      const getDataCascadeUiState = vi.fn().mockReturnValue(undefined);
      const { Wrapper } = await createWrapper({ getDataCascadeUiState });

      render(
        <Wrapper>
          <CascadedDocumentsLayout {...defaultLayoutProps} />
        </Wrapper>
      );

      expect(screen.getByTestId('mock-data-cascade')).toBeInTheDocument();
    });

    it('passes undefined initialState to DataCascade when no persisted state', async () => {
      const getDataCascadeUiState = vi.fn().mockReturnValue(undefined);
      const { Wrapper } = await createWrapper({ getDataCascadeUiState });

      render(
        <Wrapper>
          <CascadedDocumentsLayout {...defaultLayoutProps} />
        </Wrapper>
      );

      expect(mockDataCascadeProps.length).toBeGreaterThanOrEqual(1);
      const lastProps = mockDataCascadeProps[mockDataCascadeProps.length - 1];
      expect(lastProps.initialState).toBeUndefined();
    });
  });

  describe('when persistedCascadeUiState exists', () => {
    it('passes persisted restorable state to DataCascade as initialState', async () => {
      const persistedState = {
        scrollRect: { width: 800, height: 600 },
        scrollAnchorItemIndex: 5,
        expanded: { 'row-1': true },
        rowSelection: {},
        connectedChildren: {},
      };
      const getDataCascadeUiState = vi.fn().mockReturnValue(persistedState);
      const { Wrapper } = await createWrapper({ getDataCascadeUiState });

      render(
        <Wrapper>
          <CascadedDocumentsLayout {...defaultLayoutProps} />
        </Wrapper>
      );

      expect(mockDataCascadeProps.length).toBeGreaterThanOrEqual(1);
      const lastProps = mockDataCascadeProps[mockDataCascadeProps.length - 1];
      expect(lastProps.initialState).toEqual(
        expect.objectContaining({
          scrollRect: { width: 800, height: 600 },
          scrollAnchorItemIndex: 5,
          expanded: { 'row-1': true },
          rowSelection: {},
        })
      );
    });
  });
});
