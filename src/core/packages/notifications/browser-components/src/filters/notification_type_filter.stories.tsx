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
  NotificationTypeFilter,
  type NotificationTypeFilterProps,
} from './notification_type_filter';

const meta: Meta<NotificationTypeFilterProps> = {
  title: 'Notifications/TypeFilter',
  component: NotificationTypeFilter,
};

export default meta;

const demoTypeIds = [
  'notificationExampleReport',
  'notificationExampleAlert',
  'notificationExampleCloud',
];
const demoLabels = {
  notificationExampleReport: 'Report',
  notificationExampleAlert: 'Alert',
  notificationExampleCloud: 'Cloud',
};

const Template: StoryFn<{ initialSelected: readonly string[] }> = ({ initialSelected }) => {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set(initialSelected));
  return (
    <EuiPanel paddingSize="m" hasShadow style={{ maxWidth: 540 }}>
      <NotificationTypeFilter
        typeIds={demoTypeIds}
        selectedTypeIds={selected}
        labels={demoLabels}
        onChange={setSelected}
      />
    </EuiPanel>
  );
};

export const Empty: StoryFn<{ initialSelected: readonly string[] }> = Template.bind({});
Empty.args = { initialSelected: [] };

export const OneSelected: StoryFn<{ initialSelected: readonly string[] }> = Template.bind({});
OneSelected.args = { initialSelected: ['notificationExampleReport'] };

export const AllSelected: StoryFn<{ initialSelected: readonly string[] }> = Template.bind({});
AllSelected.args = { initialSelected: demoTypeIds };

export const NoLabelsKnown: StoryFn<{ initialSelected: readonly string[] }> = () => {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  return (
    <EuiPanel paddingSize="m" hasShadow style={{ maxWidth: 540 }}>
      <NotificationTypeFilter
        typeIds={['unknownPlugin1', 'unknownPlugin2']}
        selectedTypeIds={selected}
        onChange={setSelected}
      />
    </EuiPanel>
  );
};
