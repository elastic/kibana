/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiHeaderSectionItemButton, EuiIcon } from '@elastic/eui';
import { useSidebarApp } from '@kbn/core-chrome-sidebar-components';
import { useUnreadNotificationCount } from '@kbn/core-notifications-browser-hooks';
import { notificationCenterAppId } from './notification_center_app';

export function HeaderNotificationButton() {
  const unreadCount = useUnreadNotificationCount();
  const center = useSidebarApp(notificationCenterAppId);

  return (
    <EuiHeaderSectionItemButton
      aria-label={`Open notification center (${unreadCount} unread)`}
      notification={unreadCount > 0}
      onClick={() => center.open()}
    >
      <EuiIcon type="bell" size="m" aria-hidden={true} />
    </EuiHeaderSectionItemButton>
  );
}
