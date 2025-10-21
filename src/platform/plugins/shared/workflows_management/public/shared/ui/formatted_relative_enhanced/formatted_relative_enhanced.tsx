/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FormattedRelativeTime } from '@kbn/i18n-react';
import { selectUnit } from '@formatjs/intl-utils';
import moment from 'moment';
import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFormattedDateTime } from '..';

export interface FormattedRelativeEnhancedProps extends Intl.RelativeTimeFormatOptions {
  value: Date | number | string;
  thresholds?: Partial<Record<'second' | 'minute' | 'hour' | 'day', number>>;
  updateIntervalInSeconds?: number;
  fullDateTooltip?: boolean;
  fullDateTooltipPosition?: 'top' | 'right' | 'bottom' | 'left';
}
/**
 * Mimic `FormattedRelative` previous behavior from formatJS v2
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
  const fullDateFormatted = useFormattedDateTime(valueDate);

  const { value, unit } = selectUnit(valueDate, new Date(), thresholds);

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
    <EuiToolTip content={fullDateFormatted} position={fullDateTooltipPosition}>
      {content}
    </EuiToolTip>
  );
};
