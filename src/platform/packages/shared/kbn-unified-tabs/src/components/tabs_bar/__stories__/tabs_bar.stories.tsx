/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ComponentStory } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { TabsBar, type TabsBarProps } from '../tabs_bar';
import { STORYBOOK_TITLE } from '../../storybook_constants';

export default {
  title: `${STORYBOOK_TITLE}/Tabs Bar`,
};

const TabsBarTemplate: ComponentStory<React.FC<TabsBarProps>> = (args) => (
  <TabsBar {...args} onSelected={action('onSelected')} onClosed={action('onClosed')} />
);

export const Default = TabsBarTemplate.bind({});
Default.args = {
  initialItems: [
    {
      id: '1',
      label: 'Tab 1',
    },
  ],
};

export const WithMultipleTabs = TabsBarTemplate.bind({});
WithMultipleTabs.args = {
  initialItems: [
    {
      id: '1',
      label: 'Tab 1',
    },
    {
      id: '2',
      label: 'Tab 2',
    },
    {
      id: '3',
      label: 'Tab 3',
    },
  ],
  initialSelectedItemId: '3',
};
