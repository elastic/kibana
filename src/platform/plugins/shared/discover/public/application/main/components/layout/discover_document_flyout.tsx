/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { DocViewerApi, DocViewerRestorableState } from '@kbn/unified-doc-viewer';
import { getDisplayedColumns, getTextBasedColumnsMeta } from '@kbn/unified-data-table';
import type { DataTableColumnsMeta } from '@kbn/unified-data-table';
import { DiscoverGridFlyout } from '../../../../components/discover_grid_flyout';
import {
  DEFAULT_EXPANDED_DOC_OWNER,
  internalStateActions,
  useAppStateSelector,
  useCurrentTabAction,
  useCurrentTabDataStateContainer,
  useCurrentTabSelector,
  useInternalStateDispatch,
  useInternalStateSelector,
} from '../../state_management/redux';
import { useDataState } from '../../hooks/use_data_state';
import { useExpandedDocSync } from '../../hooks/use_expanded_doc_sync';
import { useCopyExpandedDocLink } from '../../hooks/use_copy_expanded_doc_link';
import { ExpandedDocNoticeText } from './expanded_doc_notice';

export interface DiscoverDocumentFlyoutProps {
  dataView: DataView;
  columns: string[];
  onAddColumn: (column: string) => void;
  onRemoveColumn: (column: string) => void;
  onAddFilter?: DocViewFilterFn;
}

/**
 * Renders the expanded document's flyout.
 *
 * Deliberately rendered above the data grid rather than alongside it, since the grid is nested
 * inside the Unified Histogram layout and does not mount until that has initialized. A document
 * restored from a link would otherwise have to wait on the chart before it could open.
 */
const DiscoverDocumentFlyoutComponent = ({
  dataView,
  columns,
  onAddColumn,
  onRemoveColumn,
  onAddFilter,
}: DiscoverDocumentFlyoutProps) => {
  const dispatch = useInternalStateDispatch();
  const query = useAppStateSelector((state) => state.query);
  const persistedDiscoverSession = useInternalStateSelector(
    (state) => state.persistedDiscoverSession
  );
  const expandedDoc = useCurrentTabSelector((state) => state.expandedDoc);
  const expandedDocOwner = useCurrentTabSelector((state) => state.expandedDocOwner);
  const renderDocumentViewMeta = useCurrentTabSelector((state) => state.renderDocumentViewMeta);
  const initialDocViewerTabId = useCurrentTabSelector((state) => state.initialDocViewerTabId);
  const cascadedColumnsMeta = useCurrentTabSelector(
    (state) => state.cascadedDocumentsState.columnsMeta
  );

  const dataStateContainer = useCurrentTabDataStateContainer();
  const documentState = useDataState(dataStateContainer.data$.documents$);
  const rows = useMemo(() => documentState.result ?? [], [documentState.result]);

  const { hasExpandedDoc, requestState, notice } = useExpandedDocSync({
    dataView,
    rows,
    fetchStatus: documentState.fetchStatus,
  });
  const copyExpandedDocLink = useCopyExpandedDocLink({ dataView });

  const setExpandedDoc = useCurrentTabAction(internalStateActions.setExpandedDoc);
  const setExpandedDocForCurrentOwner = useCallback(
    (doc?: DataTableRecord) => {
      dispatch(
        setExpandedDoc({
          expandedDoc: doc,
          expandedDocOwner: doc ? expandedDocOwner ?? DEFAULT_EXPANDED_DOC_OWNER : undefined,
        })
      );
    },
    [dispatch, expandedDocOwner, setExpandedDoc]
  );

  const docViewerRef = useRef<DocViewerApi>(null);

  useEffect(() => {
    if (initialDocViewerTabId) {
      docViewerRef.current?.setSelectedTabId(initialDocViewerTabId);
    }
  }, [initialDocViewerTabId]);

  const docViewerUiState = useCurrentTabSelector((state) => state.uiState.docViewer);
  const setDocViewerUiState = useCurrentTabAction(internalStateActions.setDocViewerUiState);
  const onInitialDocViewerStateChange = useCallback(
    (newDocViewerUiState: Partial<DocViewerRestorableState>) => {
      dispatch(setDocViewerUiState({ docViewerUiState: newDocViewerUiState }));
    },
    [dispatch, setDocViewerUiState]
  );

  const setInitialDocViewerTabIdAction = useCurrentTabAction(
    internalStateActions.setInitialDocViewerTabId
  );
  const onUpdateSelectedTabId = useCallback(
    (tabId: string | undefined) => {
      dispatch(setInitialDocViewerTabIdAction({ initialDocViewerTabId: tabId }));
    },
    [dispatch, setInitialDocViewerTabIdAction]
  );

  const columnsMeta: DataTableColumnsMeta | undefined = useMemo(
    () =>
      documentState.esqlQueryColumns
        ? getTextBasedColumnsMeta(documentState.esqlQueryColumns)
        : undefined,
    [documentState.esqlQueryColumns]
  );

  const flyoutColumnsMeta = useMemo(() => {
    if (!expandedDocOwner || expandedDocOwner === DEFAULT_EXPANDED_DOC_OWNER) {
      return columnsMeta;
    }
    return cascadedColumnsMeta;
  }, [expandedDocOwner, columnsMeta, cascadedColumnsMeta]);

  // The grid reports the columns it renders, but the flyout can open before the grid exists,
  // so fall back to the same derivation the grid uses
  const displayedColumns = useMemo(
    () => getDisplayedColumns(columns, dataView),
    [columns, dataView]
  );

  if (!hasExpandedDoc) {
    return null;
  }

  return (
    <DiscoverGridFlyout
      dataView={dataView}
      hit={expandedDoc}
      requestState={requestState}
      notice={<ExpandedDocNoticeText notice={notice} />}
      hits={renderDocumentViewMeta?.displayedRows}
      // if default columns are used, don't make them part of the URL - the context state handling will take care to restore them
      columns={renderDocumentViewMeta?.displayedColumns ?? displayedColumns}
      columnsMeta={flyoutColumnsMeta}
      savedSearchId={persistedDiscoverSession?.id!}
      query={query}
      initialTabId={initialDocViewerTabId}
      onFilter={onAddFilter}
      onRemoveColumn={onRemoveColumn}
      onAddColumn={onAddColumn}
      onClose={() => setExpandedDocForCurrentOwner(undefined)}
      setExpandedDoc={setExpandedDocForCurrentOwner}
      onCopyLink={copyExpandedDocLink}
      docViewerRef={docViewerRef}
      onUpdateSelectedTabId={onUpdateSelectedTabId}
      initialDocViewerState={docViewerUiState}
      onInitialDocViewerStateChange={onInitialDocViewerStateChange}
    />
  );
};

export const DiscoverDocumentFlyout = memo(DiscoverDocumentFlyoutComponent);
