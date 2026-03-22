/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo, useRef } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type {
  DocViewerSnapshot,
  GetDocViewerExternalStore,
  UnifiedDataTableProps,
} from '../components/data_table';
import type { DataTableColumnsMeta } from '../types';

export interface UseDocumentViewFlyoutConnectionHandlerOptions {
  /** The expanded document - controlled by the consumer */
  expandedDoc: DataTableRecord | undefined;
  /** Callback to set the expanded document */
  setExpandedDoc: (
    doc?: DataTableRecord,
    options?: { initialTabId?: string; initialTabState?: object }
  ) => void;
}

export interface ConnectedGridMeta {
  customColumnsMeta?: DataTableColumnsMeta;
  displayedColumns: string[];
  displayedRows: DataTableRecord[];
}

const createDefaultDocViewerSnapshot = (): DocViewerSnapshot => ({
  expandedDoc: undefined,
});

/**
 * Creates a connection handler for the document view flyout that the consumer passes
 * to UnifiedDataTable via documentViewFlyoutConnectionHandler. The UnifiedDataTable
 * uses this handler to subscribe to expanded doc state and to set the expanded doc
 * when the user clicks the expand button.
 *
 * @example
 * ```tsx
 * const [expandedDoc, setExpandedDoc] = useState();
 * const { documentViewFlyoutConnectionHandler, connectedGridMeta } =
 *   useDocumentViewFlyoutConnectionHandler({
 *     expandedDoc,
 *     setExpandedDoc,
 *   });
 *
 * return (
 *   <>
 *     <UnifiedDataTable
 *       documentViewFlyoutConnectionHandler={documentViewFlyoutConnectionHandler}
 *       {...props}
 *     />
 *     {expandedDoc && (
 *       <DiscoverGridFlyout
 *         hit={expandedDoc}
 *         hits={connectedGridMeta.current?.displayedRows ?? []}
 *         columns={connectedGridMeta.current?.displayedColumns ?? []}
 *         columnsMeta={connectedGridMeta.current?.customColumnsMeta}
 *         setExpandedDoc={setExpandedDoc}
 *         onClose={() => setExpandedDoc(undefined)}
 *         {...flyoutProps}
 *       />
 *     )}
 *   </>
 * );
 * ```
 */
export function useDocumentViewFlyoutConnectionHandler({
  expandedDoc,
  setExpandedDoc,
}: UseDocumentViewFlyoutConnectionHandlerOptions): {
  documentViewFlyoutConnectionHandler: NonNullable<
    UnifiedDataTableProps['documentViewFlyoutConnectionHandler']
  >;
  connectedGridMeta: React.MutableRefObject<ConnectedGridMeta | null>;
} {
  const latestExpandedDocRef = useRef(expandedDoc);
  const connectedGridMeta = useRef<ConnectedGridMeta | null>(null);

  const storeRef = useRef<{
    listeners: Set<() => void>;
    snapshot: DocViewerSnapshot;
  }>({
    listeners: new Set(),
    snapshot: createDefaultDocViewerSnapshot(),
  });

  const notifyListeners = useCallback(() => {
    storeRef.current.snapshot = {
      expandedDoc: latestExpandedDocRef.current,
    };
    storeRef.current.listeners.forEach((listener) => listener());
  }, []);

  const wrappedSetExpandedDoc = useCallback(
    (
      doc: DataTableRecord | undefined,
      options?: { initialTabId?: string; initialTabState?: object }
    ) => {
      latestExpandedDocRef.current = doc;
      setExpandedDoc(doc, options);
      notifyListeners();
    },
    [setExpandedDoc, notifyListeners]
  );

  const subscribe = useCallback((listener: () => void) => {
    storeRef.current.listeners.add(listener);
    return () => storeRef.current.listeners.delete(listener);
  }, []);

  const getSnapshot = useCallback((): DocViewerSnapshot => storeRef.current.snapshot, []);

  const getServerSnapshot = useCallback(() => storeRef.current.snapshot, []);

  const externalStore = useMemo<GetDocViewerExternalStore>(
    () => ({
      subscribe,
      getSnapshot,
      getServerSnapshot,
    }),
    [subscribe, getSnapshot, getServerSnapshot]
  );

  const documentViewFlyoutConnectionHandler = useCallback<
    NonNullable<UnifiedDataTableProps['documentViewFlyoutConnectionHandler']>
  >(
    (displayedRows, displayedColumns, customColumnsMeta) => {
      if (connectedGridMeta.current && latestExpandedDocRef.current) {
        // if the document viewer is open we want to update the expanded doc to the first row of the grid
        wrappedSetExpandedDoc(displayedRows[0]);
      }

      connectedGridMeta.current = {
        customColumnsMeta,
        displayedColumns,
        displayedRows,
      };

      notifyListeners();

      return {
        externalStore,
        setExpandedDoc: wrappedSetExpandedDoc,
      };
    },
    [externalStore, notifyListeners, wrappedSetExpandedDoc]
  );

  return {
    documentViewFlyoutConnectionHandler,
    connectedGridMeta,
  };
}
