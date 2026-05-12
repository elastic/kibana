/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { EuiPanel } from '@elastic/eui';
import {
  NotificationReadStateFilter,
  type NotificationReadState,
} from './notification_read_state_filter';

const meta: Meta = {
  title: 'Notifications/ReadStateFilter',
  component: NotificationReadStateFilter,
};

export default meta;

const Template: StoryFn<{ initial: NotificationReadState }> = ({ initial }) => {
  const [value, setValue] = useState<NotificationReadState>(initial);
  return (
    <EuiPanel paddingSize="m" hasShadow style={{ maxWidth: 540 }}>
      <NotificationReadStateFilter value={value} onChange={setValue} />
    </EuiPanel>
  );
};

export const All: StoryFn<{ initial: NotificationReadState }> = Template.bind({});
All.args = { initial: 'all' };

export const Unread: StoryFn<{ initial: NotificationReadState }> = Template.bind({});
Unread.args = { initial: 'unread' };

export const Read: StoryFn<{ initial: NotificationReadState }> = Template.bind({});
Read.args = { initial: 'read' };
