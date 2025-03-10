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
import { Tab, type TabProps } from '../tab';
import { STORYBOOK_TITLE } from './storybook_constants';

const asyncAction =
  (name: string) =>
  async (...params: any[]) => {
    action(name)(...params);
  };

export default {
  title: `${STORYBOOK_TITLE}/Tab`,
  parameters: {
    backgrounds: {
      default: 'white',
      values: [{ name: 'white', value: '#fff' }],
    },
  },
};

const tabsSizeConfig = {
  isScrollable: false,
  regularTabMaxWidth: 280,
  regularTabMinWidth: 96,
};

const TabTemplate: ComponentStory<React.FC<TabProps>> = (args) => (
  <Tab
    {...args}
    tabsSizeConfig={tabsSizeConfig}
    onLabelEdited={asyncAction('onLabelEdited')}
    onSelect={asyncAction('onSelect')}
    onClose={asyncAction('onClose')}
  />
);

export const Default = TabTemplate.bind({});
Default.args = {
  item: {
    id: '1',
    label: 'Tab 1',
  },
  isSelected: false,
};

export const Selected = TabTemplate.bind({});
Selected.args = {
  item: {
    id: '1',
    label: 'Tab 1',
  },
  isSelected: true,
};

export const WithLongLabel = TabTemplate.bind({});
WithLongLabel.args = {
  item: {
    id: '1',
    label: 'Tab with a very long label that should be truncated',
  },
  isSelected: false,
};

export const WithLongLabelSelected = TabTemplate.bind({});
WithLongLabelSelected.args = {
  item: {
    id: '1',
    label: 'Tab with a very long label that should be truncated',
  },
  isSelected: true,
};
