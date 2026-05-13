/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiHeaderSectionItemButton, EuiIcon, useEuiTheme } from '@elastic/eui';
import { useSidebar, useSidebarApp } from '@kbn/core-chrome-sidebar-components';
import { useUnreadNotificationCount } from '@kbn/core-notifications-browser-hooks';
import { notificationCenterAppId } from './notification_center_app';

export function HeaderNotificationButton() {
  const unreadCount = useUnreadNotificationCount();
  const center = useSidebarApp(notificationCenterAppId);
  const { isOpen, currentAppId } = useSidebar();
  const { euiTheme } = useEuiTheme();

  const isActive = isOpen && currentAppId === notificationCenterAppId;

  const handleClick = () => {
    if (isActive) {
      center.close();
    } else {
      center.open();
    }
  };

  return (
    <EuiHeaderSectionItemButton
      aria-label={`${isActive ? 'Close' : 'Open'} notification center (${unreadCount} unread)`}
      notification={unreadCount > 0}
      isSelected={isActive}
      style={isActive ? { backgroundColor: euiTheme.components.buttons.backgroundEmptyPrimaryActive } : undefined}
      onClick={handleClick}
    >
      <EuiIcon type="bell" size="m" aria-hidden={true} />
    </EuiHeaderSectionItemButton>
  );
}
