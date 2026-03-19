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
import { debounce } from 'lodash';
import useLatest from 'react-use/lib/useLatest';
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

  const latestExpandedDocRef = useLatest(expandedDoc);

  const setExpandedRowsRef = useRef<{
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
    () =>
      debounce(() => {
        storeRef.current.snapshot = {
          expandedDoc: latestExpandedDocRef.current,
        };

        storeRef.current.listeners.forEach((listener) => listener());
      }, 100),
    [latestExpandedDocRef]
  );

  useEffect(() => () => notifyListeners.cancel(), [notifyListeners]);

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

      notifyListeners();
    },
    [dispatch, setExpandedDocAction, notifyListeners]
  );

  const subscribe = useCallback((onUISnapshotChange: () => void) => {
    storeRef.current.listeners.add(onUISnapshotChange);
    return () => {
      storeRef.current.listeners.delete(onUISnapshotChange);
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

  const renderDocumentView = useCallback<
    NonNullable<UnifiedDataTableProps['renderDocumentViewFlyout']>
  >(
    (displayedRows, displayedColumns, customColumnsMeta) => {
      if (setExpandedRowsRef.current?.displayedRows[0]?.id !== displayedRows[0]?.id) {
        setExpandedDoc(undefined);
      }

      setExpandedRowsRef.current = {
        customColumnsMeta,
        displayedColumns,
        displayedRows,
      };
      return {
        externalStore: getStateStore,
        setExpandedDoc,
      };
    },
    [getStateStore, setExpandedDoc]
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
          hits={setExpandedRowsRef.current!.displayedRows}
          columns={setExpandedRowsRef.current!.displayedColumns}
          columnsMeta={setExpandedRowsRef.current!.customColumnsMeta}
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

  return { DiscoverGridFlyoutRenderer, renderDocumentView };
}
