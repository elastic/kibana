/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { Meta, StoryFn } from '@storybook/react';

import { EuiPanel } from '@elastic/eui';
import { NotificationEvent, type NotificationEventProps } from './notification_event';

const meta: Meta<NotificationEventProps> = {
  title: 'Notifications/Event',
  component: NotificationEvent,
  argTypes: {
    type: {
      options: ['info', 'warning', 'error'],
      control: { type: 'select' },
    },
    isRead: {
      control: { type: 'boolean' },
      defaultValue: false,
    },
  },
};

export default meta;

export const Event: StoryFn<NotificationEventProps> = (args) => (
  <EuiPanel paddingSize="none" hasShadow={true} style={{ maxWidth: '540px' }}>
    <NotificationEvent
      {...args}
      id={'1234'}
      type="Report"
      iconType="logoKibana"
      iconAriaLabel="Kibana"
      time="1 min ago"
      title="[Error Monitoring Report] is generated"
      primaryAction="Download"
      primaryActionProps={{
        iconType: 'download',
      }}
      onClickPrimaryAction={() => {}}
      messages={['The reported was generated at 17:12:16 GMT+4']}
      onClickTitle={() => {}}
    />
  </EuiPanel>
);
