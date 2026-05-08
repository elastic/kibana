/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo } from 'react';
import { EuiToolTip, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import moment from 'moment';

export interface UpdatedAtCellProps {
  /** The `updatedAt` value from the content list item. */
  updatedAt?: Date;
}

const UNKNOWN_LABEL = i18n.translate(
  'contentManagement.contentList.table.column.updatedAt.unknownLabel',
  { defaultMessage: 'Last updated unknown' }
);

/** Number of days within which relative time formatting is used. */
const RELATIVE_TIME_THRESHOLD_DAYS = 7;

/**
 * Cell renderer for the `UpdatedAt` column.
 *
 * Displays the last updated timestamp with the following formatting:
 * - Within the last 7 days: locale-aware relative time via `FormattedRelative`
 *   from `@kbn/i18n-react` (e.g., "2 hours ago"). Auto-updates as time passes.
 * - Older than 7 days: abbreviated absolute date (e.g., "Jan 5, 2025").
 * - Missing value: dash with tooltip "Last updated unknown".
 *
 * A tooltip always shows the full date and time (e.g., "January 5, 2025 3:42 PM").
 *
 * Memoized to prevent unnecessary re-renders when parent table re-renders.
 */
export const UpdatedAtCell = memo(({ updatedAt }: UpdatedAtCellProps) => {
  let content: React.ReactNode = '-';
  let testSubj = 'content-list-table-updatedAt-unknown';
  let tooltip = UNKNOWN_LABEL;

  if (updatedAt) {
    testSubj = 'content-list-table-updatedAt-value';
    const now = moment();
    const updatedAtMoment = moment(updatedAt);
    tooltip = updatedAtMoment.format('LL LT');
    const isRecent = updatedAtMoment.diff(now, 'days') > -RELATIVE_TIME_THRESHOLD_DAYS;

    if (isRecent) {
      content = <FormattedRelative value={updatedAt} />;
    } else {
      content = updatedAtMoment.format('ll');
    }
  }

  return (
    <EuiToolTip content={tooltip}>
      <EuiText size="s" color="subdued" tabIndex={0} data-test-subj={testSubj}>
        {content}
      </EuiText>
    </EuiToolTip>
  );
});

UpdatedAtCell.displayName = 'UpdatedAtCell';
