/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiToolTip } from '@elastic/eui';
import { selectUnit } from '@formatjs/intl-utils';
import moment from 'moment';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedRelativeTime } from '@kbn/i18n-react';
import { useFormattedDateTime } from '../use_formatted_date';

export interface FormattedRelativeEnhancedProps extends Intl.RelativeTimeFormatOptions {
  value: Date | number | string;
  thresholds?: Partial<Record<'second' | 'minute' | 'hour' | 'day', number>>;
  updateIntervalInSeconds?: number;
  fullDateTooltip?: boolean;
  fullDateTooltipPosition?: 'top' | 'right' | 'bottom' | 'left';
}

// Only show "year" unit if the date is more than this many days ago.
// This prevents "last year" from showing for dates that are only a few weeks/months old
// but cross the year boundary (e.g., Dec 20 viewed on Jan 10).
const MIN_DAYS_FOR_YEAR_UNIT = 180; // 6 months

// Only show "month" unit if the date is at least this many days ago.
// This prevents "1 month ago" from showing for dates that are only a few days old
// but cross the calendar month boundary (e.g., Jun 26 viewed on Jul 1).
const MIN_DAYS_FOR_MONTH_UNIT = 28;

/**
 * Mimic `FormattedRelative` previous behavior from formatJS v2,
 * with fixes for calendar-boundary rounding to avoid misleading relative displays.
 *
 * selectUnit picks its unit from calendar arithmetic (e.g. Jul − Jun = 1 month) rather
 * than elapsed time, so when the current date crosses a month or year boundary it can
 * inflate a few-days-old timestamp into "1 month ago" or "last year". We recompute in
 * a smaller unit when the actual elapsed days don't back the reported unit.
 */
export const FormattedRelativeEnhanced = ({
  value: valueInput,
  updateIntervalInSeconds,
  thresholds,
  numeric = 'auto',
  fullDateTooltip = false,
  fullDateTooltipPosition,
  ...rest
}: FormattedRelativeEnhancedProps) => {
  const valueDate = moment(valueInput).isValid() ? moment(valueInput).toDate() : new Date();

  let { value, unit } = selectUnit(valueDate, new Date(), thresholds);

  // Fix for year boundary issue: if selectUnit chose "year" but less than MIN_DAYS_FOR_YEAR_UNIT
  // have passed, use a more appropriate unit to avoid misleading "last year" for recent dates
  if (unit === 'year') {
    const diffDays = Math.abs(moment().diff(moment(valueDate), 'days'));
    if (diffDays < MIN_DAYS_FOR_YEAR_UNIT) {
      // Use the original selectUnit result's value sign to determine past/future
      const isPast = value < 0;
      const diffMonths = Math.abs(moment().diff(moment(valueDate), 'months'));
      if (diffMonths >= 1) {
        value = isPast ? -diffMonths : diffMonths;
        unit = 'month';
      } else {
        // Less than a month - use weeks
        const diffWeeks = Math.round(diffDays / 7);
        value = isPast ? -diffWeeks : diffWeeks;
        unit = 'week';
      }
    }
  }

  // Fix for month boundary issue: if selectUnit chose "month" but less than
  // MIN_DAYS_FOR_MONTH_UNIT have actually elapsed, use weeks or days instead. Prevents
  // "1 month ago" on e.g. Jul 1 for a Jun 26 timestamp.
  if (unit === 'month') {
    const diffDays = Math.abs(moment().diff(moment(valueDate), 'days'));
    if (diffDays < MIN_DAYS_FOR_MONTH_UNIT) {
      const isPast = value < 0;
      if (diffDays >= 7) {
        const diffWeeks = Math.round(diffDays / 7);
        value = isPast ? -diffWeeks : diffWeeks;
        unit = 'week';
      } else {
        value = isPast ? -diffDays : diffDays;
        unit = 'day';
      }
    }
  }

  if (unit === 'second') {
    return i18n.translate('workflows.formattedRelativeEnhanced.justNow', {
      defaultMessage: 'just now',
    });
  }

  const content = (
    <FormattedRelativeTime
      value={value}
      unit={unit}
      updateIntervalInSeconds={updateIntervalInSeconds}
      {...rest}
    />
  );

  if (!fullDateTooltip) {
    return content;
  }

  return (
    <WithTooltip valueDate={valueDate} fullDateTooltipPosition={fullDateTooltipPosition}>
      {content}
    </WithTooltip>
  );
};

// Separate component to avoid calling useFormattedDateTime when fullDateTooltip is false
function WithTooltip({
  children,
  valueDate,
  fullDateTooltipPosition,
}: {
  children: React.ReactElement;
  valueDate: Date;
  fullDateTooltipPosition?: 'top' | 'right' | 'bottom' | 'left';
}) {
  const fullDateFormatted = useFormattedDateTime(valueDate);
  return (
    <EuiToolTip content={fullDateFormatted} position={fullDateTooltipPosition}>
      {children}
    </EuiToolTip>
  );
}
