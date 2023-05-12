/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { notification } from '@cord-sdk/react';

import { EuiHeaderSectionItemButton, EuiIcon } from '@elastic/eui';
import { NotificationFlyout } from './flyout';

export const NotificationButton = () => {
  const notifications = notification.useSummary();
  const [isOpen, setIsOpen] = useState(false);
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    const unread = notifications?.unread || 0;
    setHasNew(unread > 0);
  }, [notifications]);

  const onButtonClick = () => setIsOpen((open) => !open);
  const onClose = () => setIsOpen(false);

  return (
    <>
      <EuiHeaderSectionItemButton
        aria-expanded={isOpen}
        aria-haspopup="true"
        notification={hasNew ? true : null}
        onClick={onButtonClick}
      >
        <EuiIcon type="bell" size="m" />
      </EuiHeaderSectionItemButton>
      {isOpen ? <NotificationFlyout {...{ onClose }} /> : null}
    </>
  );
};
