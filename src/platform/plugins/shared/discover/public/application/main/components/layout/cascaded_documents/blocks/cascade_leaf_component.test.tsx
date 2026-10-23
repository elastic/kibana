/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { AggregateQuery } from '@kbn/es-query';
import { BehaviorSubject } from 'rxjs';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { DataTableRecord } from '@kbn/discover-utils';
import { act, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { createMockEsqlSource } from '@kbn/data-source/src/__mocks__/esql_source.mock';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import {
  DataGridDensity,
  UnifiedDataTable,
  type UnifiedDataTableProps,
} from '@kbn/unified-data-table';
import { createChildVirtualizerController } from '@kbn/shared-ux-document-data-cascade/src/lib/core/virtualizer/child_virtualizer_controller';
import type { DataCascadeRowCellProps } from '@kbn/shared-ux-document-data-cascade';
import { createDiscoverServicesMock } from '../../../../../../__mocks__/services';
import { DiscoverTestProvider } from '../../../../../../__mocks__/test_provider';
import { dataViewWithTimefieldMock } from '../../../../../../__mocks__/data_view_with_timefield';
import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../../../../../context_awareness';
import {
  CascadedDocumentsProvider,
  type CascadedDocumentsContext,
} from '../cascaded_documents_provider';
import { ESQLDataCascadeLeafCell } from './cascade_leaf_component';
import type { ESQLDataGroupNode } from './types';
import {
  CascadedDocumentsFetcher,
  type CascadedDocumentsStateManager,
} from '../../../../data_fetching/cascaded_documents_fetcher';
import type { DiscoverServices } from '../../../../../../build_services';
import type { DataSource } from '@kbn/data-source';

jest.mock('@kbn/unified-data-table', () => ({
  ...jest.requireActual('@kbn/unified-data-table'),
  UnifiedDataTable: jest.fn(() => <div data-test-subj="unifiedDataTableMock" />),
}));

const mockGetOffsetForIndex = jest.fn(() => [1234, 'center']);
const mockScrollToIndex = jest.fn();

jest.mock('@kbn/shared-ux-document-data-cascade', () => {
  const actual = jest.requireActual('@kbn/shared-ux-document-data-cascade');
  return {
    ...actual,
    useConnectedChildVirtualizer: (...args: unknown[]) => {
      const result = actual.useConnectedChildVirtualizer(...args);
      result.virtualizer.getOffsetForIndex = mockGetOffsetForIndex;
      Object.defineProperty(result.virtualizer, 'scrollToIndex', {
        value: mockScrollToIndex,
        configurable: true,
      });
      return result;
    },
  };
});

const unifiedDataTableMock = jest.mocked(UnifiedDataTable);

const esqlQuery: AggregateQuery = { esql: 'FROM logs | STATS count() BY extension' };
const expandedDoc = buildDataTableRecord(esHitsMock[0], dataViewWithTimefieldMock);
const nextExpandedDoc = buildDataTableRecord(esHitsMock[1], dataViewWithTimefieldMock);
const cellData = [expandedDoc, nextExpandedDoc];
const cellId = 'leaf-1';
const nodePath = ['extension'];
const nodePathMap = { extension: 'png' };
const cascadePath = { nodePath, nodePathMap };
const cascadedLeafDataSource = createMockEsqlSource([
  { name: 'category', type: 'string', source: 'index' },
]);

const createVirtualizerController = () =>
  createChildVirtualizerController({ getRootVirtualizer: () => undefined });

const createCascadedDocumentsFetcher = (services: DiscoverServices) => {
  const stateManager: CascadedDocumentsStateManager = {
    getIsActiveInstance: jest.fn(() => true),
    getCascadedDocuments: jest.fn(() => undefined),
    setCascadedDocuments: jest.fn(),
  };
  const scopedProfilesManager = services.profilesManager.createScopedProfilesManager({
    scopedEbtManager: services.ebtManager.createScopedEBTManager(),
    toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
  });

  return new CascadedDocumentsFetcher(
    services,
    scopedProfilesManager,
    stateManager,
    new BehaviorSubject<DataSource | undefined>(undefined),
    new BehaviorSubject<DataSource | undefined>(undefined)
  );
};

type StickyHeaderExtensionPoint = Parameters<
  DataCascadeRowCellProps<ESQLDataGroupNode, DataTableRecord>['children']
>[0]['stickyHeaderExtensionPoint'];

const createStickyHeaderExtensionPoint = (): StickyHeaderExtensionPoint => ({
  stickyEnabled: true,
  extensionPointElement: document.createElement('div'),
});

const renderLeafCellWithContext = ({
  contextValue,
  services,
  stickyHeaderExtensionPoint = createStickyHeaderExtensionPoint(),
  virtualizerController = createVirtualizerController(),
}: {
  contextValue: CascadedDocumentsContext;
  services: DiscoverServices;
  stickyHeaderExtensionPoint?: StickyHeaderExtensionPoint;
  virtualizerController?: ReturnType<typeof createVirtualizerController>;
}) => {
  return (
    <DiscoverTestProvider services={services}>
      <CascadedDocumentsProvider value={contextValue}>
        <ESQLDataCascadeLeafCell
          cellData={cellData}
          cellId={cellId}
          nodePath={nodePath}
          nodePathMap={nodePathMap}
          rowIndex={0}
          virtualizerController={virtualizerController}
          dataGridDensityState={DataGridDensity.COMPACT}
          showTimeCol={true}
          dataView={dataViewWithTimefieldMock}
          showKeyboardShortcuts={false}
          onUpdateDataGridDensity={jest.fn()}
          stickyHeaderExtensionPoint={stickyHeaderExtensionPoint}
        />
      </CascadedDocumentsProvider>
    </DiscoverTestProvider>
  );
};

const createContextValue = ({
  currentOwner,
  ownerBoundSetExpandedDoc,
  ownerBoundSetRenderDocumentViewMeta,
  services,
}: {
  currentOwner: string;
  ownerBoundSetExpandedDoc: NonNullable<UnifiedDataTableProps['setExpandedDoc']>;
  ownerBoundSetRenderDocumentViewMeta: NonNullable<
    UnifiedDataTableProps['setRenderDocumentViewMeta']
  >;
  services: DiscoverServices;
}) => {
  const getExpandedDocSetter = jest.fn(
    (owner: string): NonNullable<UnifiedDataTableProps['setExpandedDoc']> => {
      if (owner !== cellId) {
        throw new Error(`Unexpected owner: ${owner}`);
      }

      return ownerBoundSetExpandedDoc;
    }
  );

  const getRenderDocumentViewMetaSetter = jest.fn(
    (owner: string): UnifiedDataTableProps['setRenderDocumentViewMeta'] | undefined => {
      if (owner !== cellId) {
        throw new Error(`Unexpected owner: ${owner}`);
      }

      return currentOwner === cellId ? ownerBoundSetRenderDocumentViewMeta : undefined;
    }
  );

  const contextValue: CascadedDocumentsContext = {
    availableCascadeGroups: ['category'],
    selectedCascadeGroups: ['category'],
    cascadedDocumentsFetcher: createCascadedDocumentsFetcher(services),
    cascadedLeafDataSource,
    esqlQuery,
    esqlVariables: undefined,
    timeRange: undefined,
    esqlApproximation: false,
    renderViewModeToggle: undefined,
    expandedDoc$: new BehaviorSubject<DataTableRecord | undefined>(expandedDoc),
    expandedDocOwner$: new BehaviorSubject<string | undefined>(currentOwner),
    getExpandedDocSetter,
    getRenderDocumentViewMetaSetter,
    cascadeGroupingChangeHandler: jest.fn(),
    onUpdateESQLQuery: jest.fn(),
    openInNewTab: jest.fn(),
    getDataCascadeUiState: jest.fn(),
    getDataGridUiStateMap: jest.fn(),
    setDataCascadeUiState: jest.fn(),
    setDataGridUiState: jest.fn(),
  };

  return {
    contextValue,
    getExpandedDocSetter,
    getRenderDocumentViewMetaSetter,
  };
};

describe('ESQLDataCascadeLeafCell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes owner-bound props to the leaf grid when the leaf owns the expanded doc', () => {
    const services = createDiscoverServicesMock();
    const ownerBoundSetExpandedDoc = jest.fn();
    const ownerBoundSetRenderDocumentViewMeta = jest.fn();
    const { contextValue, getExpandedDocSetter, getRenderDocumentViewMetaSetter } =
      createContextValue({
        currentOwner: cellId,
        ownerBoundSetExpandedDoc,
        ownerBoundSetRenderDocumentViewMeta,
        services,
      });

    renderWithI18n(renderLeafCellWithContext({ contextValue, services }));

    const unifiedDataTableProps = unifiedDataTableMock.mock.lastCall?.[0]!;

    expect(getExpandedDocSetter).toHaveBeenCalledWith(cellId, cascadePath);
    expect(getRenderDocumentViewMetaSetter).toHaveBeenCalledWith(cellId);
    expect(unifiedDataTableProps.rows).toEqual(cellData);
    expect(unifiedDataTableProps.dataSource).toBe(cascadedLeafDataSource);
    expect(unifiedDataTableProps.enableComparisonMode).toBe(true);
    expect(unifiedDataTableProps.renderDocumentView).toBe('external');
    expect(unifiedDataTableProps.expandedDoc).toEqual(expandedDoc);
    expect(unifiedDataTableProps.setExpandedDoc).toBe(ownerBoundSetExpandedDoc);
    expect(unifiedDataTableProps.setRenderDocumentViewMeta).toBe(
      ownerBoundSetRenderDocumentViewMeta
    );
  });

  it('updates leaf ownership wiring when the expanded doc owner changes', () => {
    const services = createDiscoverServicesMock();
    const ownerBoundSetExpandedDoc = jest.fn();
    const ownerBoundSetRenderDocumentViewMeta = jest.fn();
    const initialContext = createContextValue({
      currentOwner: 'other-leaf',
      ownerBoundSetExpandedDoc,
      ownerBoundSetRenderDocumentViewMeta,
      services,
    });

    const view = renderWithI18n(
      renderLeafCellWithContext({ contextValue: initialContext.contextValue, services })
    );

    let unifiedDataTableProps = unifiedDataTableMock.mock.lastCall?.[0]!;
    expect(unifiedDataTableProps.dataSource).toBe(cascadedLeafDataSource);
    expect(unifiedDataTableProps.expandedDoc).toBeUndefined();
    expect(unifiedDataTableProps.setExpandedDoc).toBe(ownerBoundSetExpandedDoc);
    expect(unifiedDataTableProps.setRenderDocumentViewMeta).toBeUndefined();

    const nextContext = createContextValue({
      currentOwner: cellId,
      ownerBoundSetExpandedDoc,
      ownerBoundSetRenderDocumentViewMeta,
      services,
    });

    view.rerender(renderLeafCellWithContext({ contextValue: nextContext.contextValue, services }));

    unifiedDataTableProps = unifiedDataTableMock.mock.lastCall?.[0]!;
    expect(nextContext.getExpandedDocSetter).toHaveBeenCalledWith(cellId, cascadePath);
    expect(nextContext.getRenderDocumentViewMetaSetter).toHaveBeenCalledWith(cellId);
    expect(unifiedDataTableProps.expandedDoc).toEqual(expandedDoc);
    expect(unifiedDataTableProps.setExpandedDoc).toBe(ownerBoundSetExpandedDoc);
    expect(unifiedDataTableProps.setRenderDocumentViewMeta).toBe(
      ownerBoundSetRenderDocumentViewMeta
    );
  });

  describe('sticky header extension point', () => {
    /**
     * `UnifiedDataTable` is mocked, so render the toolbar and custom grid body the leaf cell
     * hands to it, the same way `EuiDataGrid` would: toolbar first, then the grid body.
     */
    const renderGridPartsFromProps = (props: UnifiedDataTableProps) => {
      const BodyElement = props.renderCustomGridBody!;
      return (
        <div data-test-subj="gridRoot">
          {props.renderCustomToolbar!({
            toolbarProps: {
              hasRoomForGridControls: true,
              columnControl: null,
              columnSortingControl: null,
              keyboardShortcutsControl: null,
              displayControl: null,
              fullScreenControl: null,
            },
            gridProps: {},
          })}
          <div data-test-subj="gridBody">
            <BodyElement
              Cell={() => null}
              visibleColumns={[]}
              visibleRowData={{ startRow: 0, endRow: 0, visibleRowCount: 0 }}
              headerRow={<div data-test-subj="gridHeaderRow" />}
              footerRow={null}
              gridWidth={800}
              setCustomGridBodyProps={jest.fn()}
            />
          </div>
        </div>
      );
    };

    const renderLeafAndGridParts = (stickyHeaderExtensionPoint: StickyHeaderExtensionPoint) => {
      const services = createDiscoverServicesMock();
      const { contextValue } = createContextValue({
        currentOwner: cellId,
        ownerBoundSetExpandedDoc: jest.fn(),
        ownerBoundSetRenderDocumentViewMeta: jest.fn(),
        services,
      });

      unifiedDataTableMock.mockImplementation(renderGridPartsFromProps);
      const virtualizerController = createVirtualizerController();
      const renderLeaf = (extensionPoint: StickyHeaderExtensionPoint) =>
        renderLeafCellWithContext({
          contextValue,
          services,
          stickyHeaderExtensionPoint: extensionPoint,
          virtualizerController,
        });
      const view = render(renderLeaf(stickyHeaderExtensionPoint), { wrapper: I18nProvider });
      return {
        rerender: (extensionPoint: StickyHeaderExtensionPoint) =>
          view.rerender(renderLeaf(extensionPoint)),
      };
    };

    it('renders the toolbar and column headers in the persistent inline host', () => {
      const extensionPointElement = document.createElement('div');
      document.body.appendChild(extensionPointElement);
      try {
        renderLeafAndGridParts({ stickyEnabled: true, extensionPointElement });
        expect(extensionPointElement).toContainElement(
          screen.getByTestId('unifiedDataTableToolbar')
        );
        expect(extensionPointElement).toContainElement(screen.getByTestId('gridHeaderRow'));
        const body = screen.getByTestId('discoverCascadeCustomDataGridBody');
        expect(body).not.toHaveAttribute('data-sticky-header-active');
        expect(body.style.getPropertyValue('--discoverCascadeStickyHeaderSpacer')).toBe('');
      } finally {
        extensionPointElement.remove();
      }
    });

    it('preserves the body, toolbar, and headers through fullscreen round trips', () => {
      const extensionPointElement = document.createElement('div');
      document.body.appendChild(extensionPointElement);
      try {
        renderLeafAndGridParts({ stickyEnabled: true, extensionPointElement });
        const body = screen.getByTestId('discoverCascadeCustomDataGridBody');
        const toolbar = screen.getByTestId('unifiedDataTableToolbar');
        const headerRow = screen.getByTestId('gridHeaderRow');
        act(() => unifiedDataTableMock.mock.lastCall?.[0].onFullScreenChange?.(true));
        expect(screen.getByTestId('discoverCascadeCustomDataGridBody')).toBe(body);
        expect(screen.getByTestId('gridRoot')).toContainElement(toolbar);
        expect(body).toContainElement(headerRow);
        expect(extensionPointElement).not.toContainElement(toolbar);
        act(() => unifiedDataTableMock.mock.lastCall?.[0].onFullScreenChange?.(false));
        expect(screen.getByTestId('discoverCascadeCustomDataGridBody')).toBe(body);
        expect(extensionPointElement).toContainElement(toolbar);
        expect(extensionPointElement).toContainElement(headerRow);
      } finally {
        extensionPointElement.remove();
      }
    });

    it('keeps the same header host when sticky positioning is disabled', () => {
      const extensionPointElement = document.createElement('div');
      document.body.appendChild(extensionPointElement);
      try {
        const view = renderLeafAndGridParts({ stickyEnabled: true, extensionPointElement });
        const body = screen.getByTestId('discoverCascadeCustomDataGridBody');
        const toolbar = screen.getByTestId('unifiedDataTableToolbar');
        view.rerender({ stickyEnabled: false, extensionPointElement });
        expect(screen.getByTestId('discoverCascadeCustomDataGridBody')).toBe(body);
        expect(extensionPointElement).toContainElement(toolbar);
        expect(extensionPointElement).toContainElement(screen.getByTestId('gridHeaderRow'));
      } finally {
        extensionPointElement.remove();
      }
    });

    it('scrolls the custom virtualized body to the active in-table search match', () => {
      renderLeafAndGridParts(createStickyHeaderExtensionPoint());

      const unifiedDataTableProps = unifiedDataTableMock.mock.lastCall?.[0]!;
      expect(unifiedDataTableProps.enableInTableSearch).toBe(true);

      unifiedDataTableProps.scrollToCell!({ rowIndex: 7, columnIndex: 1, align: 'center' });

      expect(mockScrollToIndex).toHaveBeenCalledWith(7, { align: 'auto', behavior: 'auto' });
    });
  });
});
