/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { DataTableColumnsMeta, DataTableRecord } from '@kbn/discover-utils';
import type { DocViewerApi } from '@kbn/unified-doc-viewer';
import type {
  DocViewerSnapshot,
  GetDocViewerExternalStore,
  UnifiedDataTableProps,
} from '@kbn/unified-data-table';
import {
  DiscoverGridFlyout,
  type DiscoverGridFlyoutProps,
} from '../../../../../components/discover_grid_flyout';
import {
  useCurrentTabAction,
  useCurrentTabSelector,
  useInternalStateDispatch,
} from '../../../state_management/redux/hooks';
import { internalStateActions } from '../../../state_management/redux';

export type { DiscoverGridFlyoutProps };

const createDefaultDocViewerSnapshot = (): DocViewerSnapshot => ({
  expandedDoc: undefined,
});

export function useGetDiscoverGridFlyoutRenderer() {
  const docViewerRef = useRef<DocViewerApi>(null);
  const dispatch = useInternalStateDispatch();
  const setExpandedDocAction = useCurrentTabAction(internalStateActions.setExpandedDoc);
  const expandedDoc = useCurrentTabSelector((state) => state.expandedDoc);

  // Holds reference to the latest expanded doc
  const latestExpandedDocRef = useRef(expandedDoc);

  // Holds reference to the meta information of the connected grid (columns, rows, columns meta)
  // without causing unnecessary re-renders when the connected grid changes,
  // or copying over potentially large data (displayed rows).
  const connectedGridMetaInfo = useRef<{
    customColumnsMeta?: DataTableColumnsMeta;
    displayedColumns: string[];
    displayedRows: DataTableRecord[];
  } | null>(null);

  const storeRef = useRef<{
    listeners: Set<() => void>;
    snapshot: DocViewerSnapshot;
  }>({
    listeners: new Set(),
    snapshot: createDefaultDocViewerSnapshot(),
  });

  /** Notifies all subscribed listeners that the store snapshot may have changed. */
  const notifyListeners = useMemo(
    () => () => {
      storeRef.current.snapshot = {
        expandedDoc: latestExpandedDocRef.current,
      };

      storeRef.current.listeners.forEach((listener) => listener());
    },
    []
  );

  // Sync the ref with Redux state when expandedDoc changes externally
  // (e.g. via inspector, data view change, or saved search reset)
  useEffect(() => {
    if (latestExpandedDocRef.current !== expandedDoc) {
      latestExpandedDocRef.current = expandedDoc;
      notifyListeners();
    }
  }, [expandedDoc, notifyListeners]);

  const setExpandedDoc = useCallback(
    (
      doc: DataTableRecord | undefined,
      options?: {
        initialTabId?: string;
        initialTabState?: object;
      }
    ) => {
      dispatch(
        setExpandedDocAction({
          expandedDoc: doc,
          initialDocViewerTabId: options?.initialTabId,
          initialDocViewerTabState: options?.initialTabState,
        })
      );
      if (options?.initialTabId) {
        docViewerRef.current?.setSelectedTabId(options.initialTabId);
      }

      // Update the latest expanded doc reference
      latestExpandedDocRef.current = doc;

      notifyListeners();
    },
    [dispatch, setExpandedDocAction, notifyListeners]
  );

  const subscribe = useCallback((listener: () => void) => {
    storeRef.current.listeners.add(listener);
    return () => {
      storeRef.current.listeners.delete(listener);
    };
  }, []);

  const getSnapshot = useCallback((): DocViewerSnapshot => storeRef.current.snapshot, []);

  const getServerSnapshot = useCallback(() => storeRef.current.snapshot, []);

  const getStateStore = useMemo<GetDocViewerExternalStore>(
    () => ({
      subscribe,
      getSnapshot,
      getServerSnapshot,
    }),
    [subscribe, getSnapshot, getServerSnapshot]
  );

  const onCloseDocViewer = useCallback(() => {
    setExpandedDoc(undefined);
  }, [setExpandedDoc]);

  const flyoutConnectionHandler = useCallback<
    NonNullable<UnifiedDataTableProps['documentViewFlyoutConnectionHandler']>
  >(
    (displayedRows, displayedColumns, customColumnsMeta) => {
      // when connecting a new grid, we signal to the grid that no rows should be considered expanded by default, and provide the meta info of the connected grid to the flyout
      latestExpandedDocRef.current = undefined;

      connectedGridMetaInfo.current = {
        customColumnsMeta,
        displayedColumns,
        displayedRows,
      };

      notifyListeners();

      return {
        externalStore: getStateStore,
        setExpandedDoc,
      };
    },
    [getStateStore, notifyListeners, setExpandedDoc]
  );

  const curriedDiscoverGridFlyout = useCallback(
    (
      props: Omit<
        DiscoverGridFlyoutProps,
        'docViewerRef' | 'setExpandedDoc' | 'hit' | 'hits' | 'columns' | 'columnsMeta' | 'onClose'
      >
    ) =>
      expandedDoc ? (
        <DiscoverGridFlyout
          hit={expandedDoc}
          hits={connectedGridMetaInfo?.current?.displayedRows}
          columns={connectedGridMetaInfo?.current?.displayedColumns || []}
          columnsMeta={connectedGridMetaInfo?.current?.customColumnsMeta}
          docViewerRef={docViewerRef}
          setExpandedDoc={setExpandedDoc}
          onClose={onCloseDocViewer}
          {...props}
        />
      ) : null,
    [expandedDoc, onCloseDocViewer, setExpandedDoc]
  );

  const DiscoverGridFlyoutRenderer = useMemo(
    () => curriedDiscoverGridFlyout,
    [curriedDiscoverGridFlyout]
  );

  return { DiscoverGridFlyoutRenderer, flyoutConnectionHandler };
}
