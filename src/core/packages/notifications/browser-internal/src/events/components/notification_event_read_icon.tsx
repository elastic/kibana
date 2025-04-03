/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FunctionComponent } from 'react';
import { EuiIcon, EuiIconProps, useEuiI18n, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';

export type NotificationEventReadIconProps = Omit<EuiIconProps, 'type' | 'color' | 'size'> & {
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

export const NotificationEventReadIcon: FunctionComponent<NotificationEventReadIconProps> = ({
  id,
  isRead,
  eventName,
  ...rest
}) => {
  const {
    euiTheme: { size, colors },
  } = useEuiTheme();

  const readStateClassName = css`
    display: flex;
    align-items: center;
    height: ${size.l};
    margin: 0 ${size.xs};

    & svg {
      ${isRead &&
      `
      fill: transparent;
      stroke-width: 1px;
      stroke: ${colors.borderBasePlain};
    `};
    }
  `;

  const readAria = useEuiI18n('euiNotificationEventReadIcon.readAria', '{eventName} is read', {
    eventName,
  });

  const unreadAria = useEuiI18n(
    'euiNotificationEventReadIcon.unreadAria',
    '{eventName} is unread',
    {
      eventName,
    }
  );

  const readTitle = useEuiI18n('euiNotificationEventReadIcon.read', 'Read');

  const unreadTitle = useEuiI18n('euiNotificationEventReadIcon.unread', 'Unread');

  const iconAriaLabel = isRead ? readAria : unreadAria;
  const iconTitle = isRead ? readTitle : unreadTitle;

  return (
    <div className={readStateClassName}>
      <EuiIcon
        type="dot"
        aria-label={iconAriaLabel}
        title={iconTitle}
        color="primary"
        data-test-subj={`${id}-notificationEventReadIcon`}
        {...rest}
      />
    </div>
  );
};
