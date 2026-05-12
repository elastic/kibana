/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import type { EuiButtonIconProps } from '@elastic/eui';
import { EuiButtonIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';

export type NotificationEventReadButtonProps = Omit<
  EuiButtonIconProps,
  'iconType' | 'isDisabled' | 'isSelected' | 'size'
> & {
  id: string;
  /**
   * Shows an indicator of the read state of the event
   */
  isRead: boolean;
  /**
   * A unique, human-friendly name for the event to be used in aria attributes (e.g. "alert-critical-01", "cloud-no-severity-12", etc..).
   */
  eventName: string;
};

export const NotificationEventReadButton: FunctionComponent<NotificationEventReadButtonProps> = ({
  id,
  isRead,
  eventName,
  ...rest
}) => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();

  const readButtonClassName = isRead
    ? css`
        fill: transparent;
        stroke-width: 1px;
        stroke: ${colors.borderBasePlain};
      `
    : '';

  const markAsReadAria = i18n.translate('core.notifications.eventReadButton.markAsReadAria', {
    defaultMessage: 'Mark {eventName} as read',
    values: { eventName },
  });

  const markAsUnreadAria = i18n.translate('core.notifications.eventReadButton.markAsUnreadAria', {
    defaultMessage: 'Mark {eventName} as unread',
    values: { eventName },
  });

  const markAsRead = i18n.translate('core.notifications.eventReadButton.markAsRead', {
    defaultMessage: 'Mark as read',
  });

  const markAsUnread = i18n.translate('core.notifications.eventReadButton.markAsUnread', {
    defaultMessage: 'Mark as unread',
  });

  const buttonAriaLabel = isRead ? markAsUnreadAria : markAsReadAria;
  const buttonTitle = isRead ? markAsUnread : markAsRead;

  return (
    <EuiButtonIcon
      iconType="dot"
      aria-label={buttonAriaLabel}
      title={buttonTitle}
      className={readButtonClassName}
      data-test-subj={`${id}-notificationEventReadButton`}
      {...rest}
    />
  );
};
