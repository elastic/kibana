/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ReactElement } from 'react';
import { SearchSessionStatus } from '../../../../../common';
import { dateString } from '../lib/date_string';
import { UISession } from '../types';
import { StatusDef as StatusAttributes, TableText } from './';

// Shared helper function
export const getStatusText = (statusType: string): string => {
  switch (statusType) {
    case SearchSessionStatus.IN_PROGRESS:
      return i18n.translate('data.mgmt.searchSessions.status.label.inProgress', {
        defaultMessage: 'In progress',
      });
    case SearchSessionStatus.EXPIRED:
      return i18n.translate('data.mgmt.searchSessions.status.label.expired', {
        defaultMessage: 'Expired',
      });
    case SearchSessionStatus.CANCELLED:
      return i18n.translate('data.mgmt.searchSessions.status.label.cancelled', {
        defaultMessage: 'Cancelled',
      });
    case SearchSessionStatus.COMPLETE:
      return i18n.translate('data.mgmt.searchSessions.status.label.complete', {
        defaultMessage: 'Complete',
      });
    case SearchSessionStatus.ERROR:
      return i18n.translate('data.mgmt.searchSessions.status.label.error', {
        defaultMessage: 'Error',
      });
    default:
      // eslint-disable-next-line no-console
      console.error(`Unknown status ${statusType}`);
      return statusType;
  }
};

interface StatusIndicatorProps {
  now?: string;
  session: UISession;
  timezone: string;
}

// Get the fields needed to show each status type
// can throw errors around date conversions
const getStatusAttributes = ({
  now,
  session,
  timezone,
}: StatusIndicatorProps): StatusAttributes | null => {
  let expireDate: string;
  if (session.expires) {
    expireDate = dateString(session.expires!, timezone);
  } else {
    expireDate = i18n.translate('data.mgmt.searchSessions.status.expireDateUnknown', {
      defaultMessage: 'unknown',
    });
  }

  switch (session.status) {
    case SearchSessionStatus.IN_PROGRESS:
      try {
        return {
          textColor: 'default',
          icon: <EuiLoadingSpinner />,
          label: <TableText>{getStatusText(session.status)}</TableText>,
          toolTipContent: i18n.translate('data.mgmt.searchSessions.status.message.createdOn', {
            defaultMessage: 'Expires on {expireDate}',
            values: { expireDate },
          }),
        };
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        throw new Error(`Could not instantiate a createdDate object from: ${session.created}`);
      }

    case SearchSessionStatus.EXPIRED:
      try {
        const toolTipContent = i18n.translate('data.mgmt.searchSessions.status.message.expiredOn', {
          defaultMessage: 'Expired on {expireDate}',
          values: { expireDate },
        });

        return {
          icon: <EuiIcon color="#9AA" type="clock" />,
          label: <TableText>{getStatusText(session.status)}</TableText>,
          toolTipContent,
        };
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        throw new Error(`Could not instantiate an expiration Date object from: ${session.expires}`);
      }

    case SearchSessionStatus.CANCELLED:
      return {
        icon: <EuiIcon color="#9AA" type="crossInACircleFilled" />,
        label: <TableText>{getStatusText(session.status)}</TableText>,
        toolTipContent: i18n.translate('data.mgmt.searchSessions.status.message.cancelled', {
          defaultMessage: 'Cancelled by user',
        }),
      };

    case SearchSessionStatus.ERROR:
      return {
        textColor: 'danger',
        icon: <EuiIcon color="danger" type="crossInACircleFilled" />,
        label: <TableText>{getStatusText(session.status)}</TableText>,
        toolTipContent: i18n.translate('data.mgmt.searchSessions.status.message.error', {
          defaultMessage: 'Error: {error}',
          values: { error: (session as any).error || 'unknown' },
        }),
      };

    case SearchSessionStatus.COMPLETE:
      try {
        const toolTipContent = i18n.translate('data.mgmt.searchSessions.status.expiresOn', {
          defaultMessage: 'Expires on {expireDate}',
          values: { expireDate },
        });

        return {
          textColor: 'success',
          icon: <EuiIcon color="success" type="checkInCircleFilled" />,
          label: <TableText>{getStatusText(session.status)}</TableText>,
          toolTipContent,
        };
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        throw new Error(
          `Could not instantiate an expiration Date object for completed session from: ${session.expires}`
        );
      }

      // Error was thrown
      return null;

    default:
      throw new Error(`Unknown status: ${session.status}`);
  }
};

export const StatusIndicator = (props: StatusIndicatorProps) => {
  try {
    const statusDef = getStatusAttributes(props);
    const { session } = props;

    if (statusDef) {
      const { toolTipContent } = statusDef;
      let icon: ReactElement | undefined = statusDef.icon;
      let label: ReactElement = statusDef.label;

      if (icon && toolTipContent) {
        icon = <EuiToolTip content={toolTipContent}>{icon}</EuiToolTip>;
      }
      if (toolTipContent) {
        label = (
          <EuiToolTip content={toolTipContent}>
            <TableText data-test-subj={`sessionManagementStatusTooltip`}>
              {statusDef.label}
            </TableText>
          </EuiToolTip>
        );
      }

      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TableText
              color={statusDef.textColor}
              data-test-subj={`sessionManagementStatusLabel`}
              data-test-status={session.status}
            >
              {label}
            </TableText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  // Exception has been caught
  return <TableText>{props.session.status}</TableText>;
};
