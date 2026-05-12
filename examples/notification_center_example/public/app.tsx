/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageSection,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useSidebarApp } from '@kbn/core-chrome-sidebar-components';
import {
  useNotificationEventsService,
  useUnreadNotificationCount,
} from '@kbn/core-notifications-browser-hooks';
import {
  alertType,
  alertTypeId,
  cloudType,
  cloudTypeId,
  reportType,
  reportTypeId,
} from './event_types';
import { notificationCenterAppId } from './notification_center_app';

// Stable per-button ids so repeated publishes upsert (replace) the same entry.
// On reload, the persisted read/pinned state hydrates the freshly-published event.
const REPORT_EVENT_ID = `${reportTypeId}:demo-1`;
const ALERT_EVENT_ID = `${alertTypeId}:demo-1`;
const CLOUD_EVENT_ID = `${cloudTypeId}:demo-1`;

export function App() {
  const events = useNotificationEventsService();
  const unreadCount = useUnreadNotificationCount();
  const center = useSidebarApp(notificationCenterAppId);

  const openCenter = () => center.open();

  const publishReport = () => {
    events.notify({
      ...reportType,
      typeId: reportTypeId,
      id: REPORT_EVENT_ID,
      timestamp: Date.now(),
      title: '[Error Monitoring Report] is generated',
      message: 'The report was generated and is ready to download.',
      isRead: false,
    });
  };

  const publishAlert = () => {
    events.notify({
      ...alertType,
      typeId: alertTypeId,
      id: ALERT_EVENT_ID,
      timestamp: Date.now(),
      title: 'High CPU on web-1',
      message: 'CPU exceeded 90% for the last 5 minutes.',
      isRead: false,
    });
  };

  const publishCloud = () => {
    events.notify({
      ...cloudType,
      typeId: cloudTypeId,
      id: CLOUD_EVENT_ID,
      timestamp: Date.now(),
      title: 'Deployment provisioning complete',
      message: 'us-east-1 deployment is ready for use.',
      isRead: false,
    });
  };

  const publishBatch = () => {
    publishReport();
    publishAlert();
    publishCloud();
  };

  return (
    <EuiPage paddingSize="l">
      <EuiPageBody>
        <EuiPageHeader
          pageTitle="Notification Center Example"
          rightSideItems={[
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="bell"
                  aria-label={`Open notification center (${unreadCount} unread)`}
                  display="base"
                  size="m"
                  onClick={openCenter}
                />
              </EuiFlexItem>
              {unreadCount > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiNotificationBadge color="accent">{unreadCount}</EuiNotificationBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>,
          ]}
          description="Publish persistent notification events through core.notifications.events and review them in the notification center sidebar."
        />

        <EuiPageSection>
          <EuiPanel hasBorder>
            <EuiTitle size="s">
              <h3>Open the Notification Center</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p>
                Uses the typed sidebar hook to open the registered sidebar app. The bell button in
                the header does the same thing.
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiButton iconType="bell" onClick={openCenter}>
              Open Notification Center
            </EuiButton>
          </EuiPanel>

          <EuiSpacer size="m" />

          <EuiPanel hasBorder>
            <EuiTitle size="s">
              <h3>Publish events</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p>
                Each button publishes an event using one of the three demo types registered in this
                plugin&apos;s start phase (Report / Alert / Cloud).
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="s" wrap>
              <EuiFlexItem grow={false}>
                <EuiButton iconType="reportingApp" onClick={publishReport}>
                  Publish Report event
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton iconType="warning" color="danger" onClick={publishAlert}>
                  Publish Alert event
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton iconType="logoCloud" color="success" onClick={publishCloud}>
                  Publish Cloud event
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton iconType="bolt" onClick={publishBatch}>
                  Publish one of each
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiPageSection>
      </EuiPageBody>
    </EuiPage>
  );
}
