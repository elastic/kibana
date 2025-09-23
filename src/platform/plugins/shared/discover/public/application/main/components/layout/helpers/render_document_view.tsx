/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import {
  DiscoverGridFlyout,
  type DiscoverGridFlyoutProps,
} from '../../../../../components/discover_grid_flyout';

export type { DiscoverGridFlyoutProps };

export function useGetDocumentViewRenderer(docViewerRef: DiscoverGridFlyoutProps['docViewerRef']) {
  return useCallback(
    ({
      dataView,
      savedSearchId,
      query,
      initialTabId,
      onFilter,
      onRemoveColumn,
      onAddColumn,
      setExpandedDoc,
      hit,
      columns,
      hits,
      columnsMeta,
      onClose,
    }: Omit<DiscoverGridFlyoutProps, 'docViewerRef'>) => (
      <DiscoverGridFlyout
        dataView={dataView}
        hit={hit}
        hits={hits}
        // if default columns are used, don't make them part of the URL - the context state handling will take care to restore them
        columns={columns}
        columnsMeta={columnsMeta}
        savedSearchId={savedSearchId}
        onFilter={onFilter}
        onRemoveColumn={onRemoveColumn}
        onAddColumn={onAddColumn}
        onClose={onClose}
        setExpandedDoc={setExpandedDoc}
        query={query}
        initialTabId={initialTabId}
        docViewerRef={docViewerRef}
      />
    ),
    [docViewerRef]
  );
}
