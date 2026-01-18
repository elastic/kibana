/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiToolTip } from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import { useGetFormattedDateTime } from '..';

export interface FormattedRelativeEnhancedProps {
  value: Date | number | string;
  fullDateTooltip?: boolean;
  fullDateTooltipPosition?: 'top' | 'right' | 'bottom' | 'left';
}

// Configure moment thresholds to avoid "last year" for recent dates
// This ensures dates like "Dec 20" viewed on "Jan 10" show "3 weeks ago" not "last year"
// See: https://momentjs.com/docs/#/customization/relative-time-threshold/
moment.relativeTimeThreshold('M', 12); // Only show "year" after 12 months (not based on calendar year)

/**
 * Enhanced relative time formatting using moment.js with configured thresholds.
 * This avoids misleading "last year" displays for dates that are only a few weeks old
 * but cross a year boundary.
 */
export const FormattedRelativeEnhanced = ({
  value: valueInput,
  fullDateTooltip = false,
  fullDateTooltipPosition,
}: FormattedRelativeEnhancedProps) => {
  const valueDate = moment(valueInput);
  const relativeTime = valueDate.isValid() ? valueDate.fromNow() : '';

  const content = <>{relativeTime}</>;

  if (!fullDateTooltip) {
    return content;
  }

  return (
    <FormattedRelativeEnhancedWithTooltip
      content={content}
      valueDate={valueDate.toDate()}
      fullDateTooltipPosition={fullDateTooltipPosition}
    />
  );
};

/**
 * Separate component for tooltip to avoid requiring Kibana services when not needed.
 */
function FormattedRelativeEnhancedWithTooltip({
  content,
  valueDate,
  fullDateTooltipPosition,
}: {
  content: React.ReactElement;
  valueDate: Date;
  fullDateTooltipPosition?: 'top' | 'right' | 'bottom' | 'left';
}) {
  const getFormattedDateTime = useGetFormattedDateTime();
  const fullDateFormatted = getFormattedDateTime(valueDate);

  return (
    <EuiToolTip content={fullDateFormatted} position={fullDateTooltipPosition}>
      {content}
    </EuiToolTip>
  );
}
