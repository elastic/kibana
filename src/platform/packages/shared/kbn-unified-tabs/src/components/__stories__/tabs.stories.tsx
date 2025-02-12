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
import { TabbedContent, type TabbedContentProps } from '../tabbed_content';
import { STORYBOOK_TITLE } from './storybook_constants';

let TMP_COUNTER = 0;

export default {
  title: `${STORYBOOK_TITLE}/Tabs`,
  parameters: {
    backgrounds: {
      default: 'white',
      values: [{ name: 'white', value: '#fff' }],
    },
  },
};

const TabbedContentTemplate: ComponentStory<React.FC<TabbedContentProps>> = (args) => (
  <TabbedContent
    {...args}
    createItem={() => {
      TMP_COUNTER += 1;
      return {
        id: `tab_${TMP_COUNTER}`,
        label: `Tab ${TMP_COUNTER}`,
      };
    }}
    onChanged={action('onClosed')}
    renderContent={(item) => (
      <div style={{ paddingTop: '16px' }}>Content for tab: {item.label}</div>
    )}
  />
);

export const Default = TabbedContentTemplate.bind({});
Default.args = {
  initialItems: [
    {
      id: '1',
      label: 'Tab 1',
    },
  ],
};

export const WithMultipleTabs = TabbedContentTemplate.bind({});
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
