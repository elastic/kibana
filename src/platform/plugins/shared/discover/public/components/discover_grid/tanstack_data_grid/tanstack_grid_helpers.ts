/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { Column } from '@tanstack/react-table';
import type { DataTableRecord } from '@kbn/discover-utils';

export const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return '-';
  if (Array.isArray(value)) {
    return value.map((item) => formatCellValue(item)).join(', ');
  }
  return String(value);
};

export const getColumnPinningStyle = (
  column: Column<DataTableRecord, unknown>,
  { isHeader }: { isHeader?: boolean } = {}
): React.CSSProperties => {
  const pinned = column.getIsPinned();
  if (!pinned) {
    return {};
  }

  return {
    position: 'sticky',
    left: pinned === 'left' ? column.getStart('left') : undefined,
    right: pinned === 'right' ? column.getAfter('right') : undefined,
    zIndex: isHeader ? 3 : 1,
    width: column.getSize(),
    flex: '0 0 auto',
    flexShrink: 0,
  };
};
