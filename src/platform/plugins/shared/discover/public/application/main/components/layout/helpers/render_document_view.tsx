/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DocViewerApi } from '@kbn/unified-doc-viewer';
import { useDocumentViewFlyoutConnectionHandler } from '@kbn/unified-data-table';
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

export function useGetDiscoverGridFlyoutRenderer() {
  const docViewerRef = useRef<DocViewerApi>(null);
  const dispatch = useInternalStateDispatch();
  const setExpandedDocAction = useCurrentTabAction(internalStateActions.setExpandedDoc);
  const expandedDoc = useCurrentTabSelector((state) => state.expandedDoc);

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
    },
    [dispatch, setExpandedDocAction]
  );

  const { documentViewFlyoutConnectionHandler: flyoutConnectionHandler, connectedGridMeta } =
    useDocumentViewFlyoutConnectionHandler({
      expandedDoc,
      setExpandedDoc,
    });

  const onCloseDocViewer = useCallback(() => {
    setExpandedDoc(undefined);
  }, [setExpandedDoc]);

  const curriedDiscoverGridFlyout = useCallback(
    (
      props: Omit<
        DiscoverGridFlyoutProps,
        'docViewerRef' | 'setExpandedDoc' | 'hit' | 'hits' | 'columns' | 'columnsMeta' | 'onClose'
      >
    ) =>
      expandedDoc ? (
        <DiscoverGridFlyout
          key={expandedDoc.id}
          hit={expandedDoc}
          hits={connectedGridMeta.current?.displayedRows ?? []}
          columns={connectedGridMeta.current?.displayedColumns ?? []}
          columnsMeta={connectedGridMeta.current?.customColumnsMeta}
          docViewerRef={docViewerRef}
          setExpandedDoc={setExpandedDoc}
          onClose={onCloseDocViewer}
          {...props}
        />
      ) : null,
    [expandedDoc, connectedGridMeta, onCloseDocViewer, setExpandedDoc]
  );

  const DiscoverGridFlyoutRenderer = useMemo(
    () => curriedDiscoverGridFlyout,
    [curriedDiscoverGridFlyout]
  );

  return { DiscoverGridFlyoutRenderer, flyoutConnectionHandler, setExpandedDoc };
}
