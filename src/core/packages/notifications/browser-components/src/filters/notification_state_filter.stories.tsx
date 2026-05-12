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
  NotificationStateFilter,
  type NotificationStateFilterValue,
} from './notification_state_filter';

const meta: Meta = {
  title: 'Notifications/StateFilter',
  component: NotificationStateFilter,
};

export default meta;

const Template: StoryFn<{ initial: NotificationStateFilterValue }> = ({ initial }) => {
  const [value, setValue] = useState<NotificationStateFilterValue>(initial);
  return (
    <EuiPanel paddingSize="m" hasShadow style={{ maxWidth: 540 }}>
      <NotificationStateFilter value={value} onChange={setValue} />
    </EuiPanel>
  );
};

export const All: StoryFn<{ initial: NotificationStateFilterValue }> = Template.bind({});
All.args = { initial: 'all' };

export const Unread: StoryFn<{ initial: NotificationStateFilterValue }> = Template.bind({});
Unread.args = { initial: 'unread' };

export const Pinned: StoryFn<{ initial: NotificationStateFilterValue }> = Template.bind({});
Pinned.args = { initial: 'pinned' };
