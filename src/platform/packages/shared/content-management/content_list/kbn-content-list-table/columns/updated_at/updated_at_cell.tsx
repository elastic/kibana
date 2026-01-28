/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo } from 'react';
import { FormattedRelative } from '@kbn/i18n-react';

export interface UpdatedAtCellProps {
  /**
   * The date to display
   */
  date?: Date;
}

/**
 * Default renderer for the updatedAt column.
 * Displays the date as a relative time (e.g., "2 hours ago").
 *
 * Memoized to prevent unnecessary re-renders - only updates when date changes.
 */
export const UpdatedAtCell = memo(
  ({ date }: UpdatedAtCellProps) => {
    if (!date) {
      return <>-</>;
    }

    return <FormattedRelative value={date} />;
  },
  (prevProps, nextProps) => {
    // Only re-render if date actually changed
    return prevProps.date?.getTime() === nextProps.date?.getTime();
  }
);

UpdatedAtCell.displayName = 'UpdatedAtCell';
