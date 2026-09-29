/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import React from 'react';
import type { AggregateQuery } from '@kbn/es-query';
import { BehaviorSubject } from 'rxjs';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { DataTableColumnsMeta, DataTableRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import {
  DataGridDensity,
  UnifiedDataTable,
  type UnifiedDataTableProps,
} from '@kbn/unified-data-table';
import { createChildVirtualizerController } from '@kbn/shared-ux-document-data-cascade/src/lib/core/virtualizer/child_virtualizer_controller';
import { createDiscoverServicesMock } from '../../../../../../__mocks__/services';
import { DiscoverTestProvider } from '../../../../../../__mocks__/test_provider';
import { dataViewWithTimefieldMock } from '../../../../../../__mocks__/data_view_with_timefield';
import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../../../../../context_awareness';
import {
  CascadedDocumentsProvider,
  type CascadedDocumentsContext,
} from '../cascaded_documents_provider';
import { ESQLDataCascadeLeafCell } from './cascade_leaf_component';
import {
  CascadedDocumentsFetcher,
  type CascadedDocumentsStateManager,
} from '../../../../data_fetching/cascaded_documents_fetcher';
import type { DiscoverServices } from '../../../../../../build_services';

vi.mock('@kbn/unified-data-table', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/unified-data-table')),
      UnifiedDataTable: vi.fn(() => <div data-test-subj="unifiedDataTableMock" />),
    };
      return { ...mocked, default: mocked };
    });

const unifiedDataTableMock = vi.mocked(UnifiedDataTable);

const esqlQuery: AggregateQuery = { esql: 'FROM logs | STATS count() BY extension' };
const expandedDoc = buildDataTableRecord(esHitsMock[0], dataViewWithTimefieldMock);
const nextExpandedDoc = buildDataTableRecord(esHitsMock[1], dataViewWithTimefieldMock);
const cellData = [expandedDoc, nextExpandedDoc];
const cellId = 'leaf-1';
const nodePath = ['extension'];
const nodePathMap = { extension: 'png' };
const cascadePath = { nodePath, nodePathMap };
const cascadedColumnsMeta: DataTableColumnsMeta = {
  category: {
    type: 'string',
  },
};

const createVirtualizerController = () =>
  createChildVirtualizerController({ getRootVirtualizer: () => undefined });

const createCascadedDocumentsFetcher = (services: DiscoverServices) => {
  const stateManager: CascadedDocumentsStateManager = {
    getIsActiveInstance: vi.fn(() => true),
    getCascadedDocuments: vi.fn(() => undefined),
    getColumnsMeta: vi.fn(() => ({})),
    setCascadedDocuments: vi.fn(),
    setColumnsMeta: vi.fn(),
  };
  const scopedProfilesManager = services.profilesManager.createScopedProfilesManager({
    scopedEbtManager: services.ebtManager.createScopedEBTManager(),
    toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
  });

  return new CascadedDocumentsFetcher(services, scopedProfilesManager, stateManager);
};

const renderLeafCellWithContext = ({
  contextValue,
  services,
}: {
  contextValue: CascadedDocumentsContext;
  services: DiscoverServices;
}) => {
  const virtualizerController = createVirtualizerController();

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
          onUpdateDataGridDensity={vi.fn()}
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
  const getExpandedDocSetter = vi.fn(
    (owner: string): NonNullable<UnifiedDataTableProps['setExpandedDoc']> => {
      if (owner !== cellId) {
        throw new Error(`Unexpected owner: ${owner}`);
      }

      return ownerBoundSetExpandedDoc;
    }
  );

  const getRenderDocumentViewMetaSetter = vi.fn(
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
    cascadedColumnsMeta,
    esqlQuery,
    esqlVariables: undefined,
    timeRange: undefined,
    esqlApproximation: false,
    renderViewModeToggle: undefined,
    expandedDoc$: new BehaviorSubject<DataTableRecord | undefined>(expandedDoc),
    expandedDocOwner$: new BehaviorSubject<string | undefined>(currentOwner),
    getExpandedDocSetter,
    getRenderDocumentViewMetaSetter,
    cascadeGroupingChangeHandler: vi.fn(),
    onUpdateESQLQuery: vi.fn(),
    openInNewTab: vi.fn(),
    getDataCascadeUiState: vi.fn(),
    getDataGridUiStateMap: vi.fn(),
    setDataCascadeUiState: vi.fn(),
    setDataGridUiState: vi.fn(),
  };

  return {
    contextValue,
    getExpandedDocSetter,
    getRenderDocumentViewMetaSetter,
  };
};

describe('ESQLDataCascadeLeafCell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes owner-bound props to the leaf grid when the leaf owns the expanded doc', () => {
    const services = createDiscoverServicesMock();
    const ownerBoundSetExpandedDoc = vi.fn();
    const ownerBoundSetRenderDocumentViewMeta = vi.fn();
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
    expect(unifiedDataTableProps.columnsMeta).toEqual(cascadedColumnsMeta);
    expect(unifiedDataTableProps.renderDocumentView).toBe('external');
    expect(unifiedDataTableProps.expandedDoc).toEqual(expandedDoc);
    expect(unifiedDataTableProps.setExpandedDoc).toBe(ownerBoundSetExpandedDoc);
    expect(unifiedDataTableProps.setRenderDocumentViewMeta).toBe(
      ownerBoundSetRenderDocumentViewMeta
    );
  });

  it('updates leaf ownership wiring when the expanded doc owner changes', () => {
    const services = createDiscoverServicesMock();
    const ownerBoundSetExpandedDoc = vi.fn();
    const ownerBoundSetRenderDocumentViewMeta = vi.fn();
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
    expect(unifiedDataTableProps.columnsMeta).toEqual(cascadedColumnsMeta);
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
});
