/*
 * Copyright 2019 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
 */

import React, { useEffect } from 'react';
import { useNotifications } from '@logrhythm/nm-web-shared/hooks/notification_hooks';
import { useSnackbar } from '@logrhythm/nm-web-shared/hooks/notistack_hooks';

const NotificationHandler = () => {
  const notifications = useNotifications();

  const { enqueueError } = useSnackbar();

  useEffect(
    () => {
      notifications.forEach(n => {
        enqueueError(<div>{n.text}</div>);
      });
    },
    [notifications]
  );

  return null;
};

export default NotificationHandler; // eslint-disable-line
