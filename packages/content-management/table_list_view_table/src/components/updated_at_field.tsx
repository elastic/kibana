/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiToolTip } from '@elastic/eui';
import moment from 'moment';

import { DateFormatter } from '../services';

const DefaultDateFormatter: DateFormatter = ({ value, children }) =>
  children(new Date(value).toDateString());

export const UpdatedAtField: FC<{ dateTime?: string; DateFormatterComp?: DateFormatter }> = ({
  dateTime,
  DateFormatterComp = DefaultDateFormatter,
}) => {
  if (!dateTime) {
    return (
      <EuiToolTip
        content={i18n.translate('contentManagement.tableList.updatedDateUnknownLabel', {
          defaultMessage: 'Last updated unknown',
        })}
      >
        <span>-</span>
      </EuiToolTip>
    );
  }
  const updatedAt = moment(dateTime);

  if (updatedAt.diff(moment(), 'days') > -7) {
    return (
      <DateFormatterComp value={new Date(dateTime).getTime()}>
        {(formattedDate: string) => (
          <EuiToolTip content={updatedAt.format('LL LT')}>
            <span>{formattedDate}</span>
          </EuiToolTip>
        )}
      </DateFormatterComp>
    );
  }
  return (
    <EuiToolTip content={updatedAt.format('LL LT')}>
      <span>{updatedAt.format('LL')}</span>
    </EuiToolTip>
  );
};
