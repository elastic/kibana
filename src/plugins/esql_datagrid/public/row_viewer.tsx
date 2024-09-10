/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DataTableColumnsMeta } from '@kbn/unified-data-table';
import { UnifiedDocViewerFlyout } from '@kbn/unified-doc-viewer-plugin/public';
import { NotificationsStart } from '@kbn/core-notifications-browser';

export interface RowViewerProps {
  notifications?: NotificationsStart;
  columns: string[];
  columnsMeta?: DataTableColumnsMeta;
  hit: DataTableRecord;
  hits?: DataTableRecord[];
  flyoutType?: 'push' | 'overlay';
  dataView: DataView;
  onAddColumn: (column: string) => void;
  onClose: () => void;
  onRemoveColumn: (column: string) => void;
  setExpandedDoc: (doc?: DataTableRecord) => void;
}

export const FLYOUT_WIDTH_KEY = 'esqlTable:flyoutWidth';
/**
 * Flyout displaying an expanded ES|QL row
 */
export function RowViewer({
  hit,
  hits,
  dataView,
  columns,
  columnsMeta,
  notifications,
  flyoutType = 'push',
  onClose,
  onRemoveColumn,
  onAddColumn,
  setExpandedDoc,
}: RowViewerProps) {
  const services = useMemo(() => ({ toastNotifications: notifications?.toasts }), [notifications]);

  return (
    <UnifiedDocViewerFlyout
      data-test-subj="esqlRowDetailsFlyout"
      flyoutWidthLocalStorageKey={FLYOUT_WIDTH_KEY}
      flyoutType={flyoutType}
      services={services}
      isEsqlQuery={true}
      hit={hit}
      hits={hits}
      dataView={dataView}
      columns={columns}
      columnsMeta={columnsMeta}
      onAddColumn={onAddColumn}
      onRemoveColumn={onRemoveColumn}
      onClose={onClose}
      setExpandedDoc={setExpandedDoc}
    />
  );
}

// eslint-disable-next-line import/no-default-export
export default RowViewer;
