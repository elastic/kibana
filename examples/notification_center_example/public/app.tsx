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
  EuiFlexGroup,
  EuiFlexItem,
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
import { useNotificationEventsService } from '@kbn/core-notifications-browser-hooks';
import {
  alertType,
  alertTypeId,
  cloudType,
  cloudTypeId,
  reportType,
  reportTypeId,
} from './event_types';
import { notificationCenterAppId } from './notification_center_app';

// Random per-publish ids — namespaced by typeId so the id sorts nicely in
// localStorage and stays readable in devtools. Each click creates a new event,
// allowing the example to populate a high volume of notifications.
const nextId = (typeId: string) =>
  `${typeId}:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// Returns a single message string most of the time, but randomly returns an
// array of messages (~33% chance) to exercise the accordion in the center.
const withRandomExtraMessages = (primary: string, extras: string[]): string | string[] =>
  Math.random() < 0.33 ? [primary, ...extras] : primary;

export function App() {
  const events = useNotificationEventsService();
  const center = useSidebarApp(notificationCenterAppId);

  const openCenter = () => center.open();

  const publishReport = () => {
    events.notify({
      ...reportType,
      typeId: reportTypeId,
      id: nextId(reportTypeId),
      timestamp: Date.now(),
      title: '[Error Monitoring Report] is generated',
      message: withRandomExtraMessages('The report was generated and is ready to download.', [
        'File size: 2.4 MB',
        'Rows exported: 14,203',
      ]),
      isRead: false,
    });
  };

  const publishAlert = () => {
    events.notify({
      ...alertType,
      typeId: alertTypeId,
      id: nextId(alertTypeId),
      timestamp: Date.now(),
      title: 'High CPU on web-1',
      message: withRandomExtraMessages('CPU exceeded 90% for the last 5 minutes.', [
        'Current value: 94%',
        'Threshold: 90%',
        'Affected host: web-1.prod',
      ]),
      isRead: false,
    });
  };

  const publishCloud = () => {
    events.notify({
      ...cloudType,
      typeId: cloudTypeId,
      id: nextId(cloudTypeId),
      timestamp: Date.now(),
      title: 'Deployment provisioning complete',
      message: withRandomExtraMessages('us-east-1 deployment is ready for use.', [
        'Region: us-east-1',
        'Nodes: 3',
      ]),
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
