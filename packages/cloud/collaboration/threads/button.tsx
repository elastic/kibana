/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { thread } from '@cord-sdk/react';

import { EuiButton, EuiIcon, EuiNotificationBadge } from '@elastic/eui';

import { ThreadFlyout, Props as ThreadFlyoutProps, STATE_STORAGE_KEY } from './flyout';

export type Props = Omit<ThreadFlyoutProps, 'onClose'>;

export const ThreadButton = ({ application, savedObjectId, kbnStateStorage, ...props }: Props) => {
  const state = kbnStateStorage.get(STATE_STORAGE_KEY);
  const [isOpen, setIsOpen] = useState(!!state);
  const summary = thread.useLocationSummary({ page: `${application}-${savedObjectId}` });

  const onButtonClick = () => setIsOpen((open) => !open);
  const onClose = () => setIsOpen(false);

  return (
    <>
      <EuiButton onClick={onButtonClick} minWidth={0} size="s" color="text">
        <EuiIcon type="discuss" size="m" />
        {summary?.unread && summary.unread > 0 ? (
          <EuiNotificationBadge color="accent" style={{ marginLeft: 2 }}>
            {summary.unread}
          </EuiNotificationBadge>
        ) : null}
      </EuiButton>
      {isOpen ? (
        <ThreadFlyout {...{ onClose, application, savedObjectId, kbnStateStorage, ...props }} />
      ) : null}
    </>
  );
};
