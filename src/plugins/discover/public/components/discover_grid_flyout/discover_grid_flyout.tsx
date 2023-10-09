/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { KeyboardEventHandler } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiPortal } from '@elastic/eui';
import type { Filter, Query, AggregateQuery } from '@kbn/es-query';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { useDiscoverGridFlyoutBody } from './use_discover_grid_flyout_body';

export interface DiscoverGridFlyoutProps {
  savedSearchId?: string;
  filters?: Filter[];
  query?: Query | AggregateQuery;
  columns: string[];
  columnTypes?: Record<string, string>;
  hit: DataTableRecord;
  hits?: DataTableRecord[];
  dataView: DataView;
  activePage: number;
  onAddColumn: (column: string) => void;
  onClose: () => void;
  onFilter?: DocViewFilterFn;
  onRemoveColumn: (column: string) => void;
  setPage: (page: number) => void;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
}

/**
 * Flyout displaying an expanded Elasticsearch document
 */
export function DiscoverGridFlyout({
  hit,
  hits,
  dataView,
  columns,
  columnTypes,
  savedSearchId,
  filters,
  query,
  activePage,
  onFilter,
  onClose,
  onRemoveColumn,
  onAddColumn,
  setPage,
  onKeyDown,
}: DiscoverGridFlyoutProps) {
  const { header, body } = useDiscoverGridFlyoutBody({
    hit,
    hits,
    dataView,
    columns,
    columnTypes,
    savedSearchId,
    filters,
    query,
    activePage,
    onFilter,
    onRemoveColumn,
    onAddColumn,
    setPage,
  });

  return (
    <EuiPortal>
      <EuiFlyout
        onClose={onClose}
        size="m"
        data-test-subj="docTableDetailsFlyout"
        onKeyDown={onKeyDown}
        ownFocus={false}
      >
        <EuiFlyoutHeader hasBorder>{header}</EuiFlyoutHeader>
        <EuiFlyoutBody>{body}</EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
}

// eslint-disable-next-line import/no-default-export
export default DiscoverGridFlyout;
