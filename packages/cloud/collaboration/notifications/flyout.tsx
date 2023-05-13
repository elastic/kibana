/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Inbox, NotificationList } from '@cord-sdk/react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';

export interface Props {
  onClose: () => void;
}

type Section = 'notifications' | 'inbox';

export const NotificationFlyout = ({ onClose }: Props) => {
  const [currentSection, setCurrentSection] = React.useState<Section>('inbox');

  const hideCSS = css`
    visibility: hidden;
    position: absolute;
  `;

  const inboxCSS = css`
    ${currentSection === 'notifications' ? hideCSS : ''}
    --cord-inbox-border: none;
    --cord-inbox-content-horizontal-padding: 24px;
    margin-top: -32px;
  `;

  const notificationCSS = css`
    ${currentSection === 'inbox' ? hideCSS : ''}
    --cord-notification-list-box-shadow: none;
    --cord-notification-list-border: none;
  `;

  const bodyCSS = css`
    .euiFlyoutBody__overflowContent {
      padding: 0;
    }
  `;

  const flyoutCSS = css`
    &.euiFlyout {
      inline-size: 40vw;
    }
  `;

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      css={flyoutCSS}
      maskProps={{ headerZindexLocation: 'above' }}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>Notification Center</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="s">
          <p>Respond to notifications from your team and Kibana.</p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiTabs bottomBorder={false} style={{ marginBottom: '-24px' }}>
          <EuiTab
            onClick={() => setCurrentSection('inbox')}
            isSelected={currentSection === 'inbox'}
          >
            Inbox
          </EuiTab>
          <EuiTab
            onClick={() => setCurrentSection('notifications')}
            isSelected={currentSection === 'notifications'}
          >
            Notifications
          </EuiTab>
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={bodyCSS}>
        <Inbox css={inboxCSS} showCloseButton={false} showSettings={false} />
        <NotificationList css={notificationCSS} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
