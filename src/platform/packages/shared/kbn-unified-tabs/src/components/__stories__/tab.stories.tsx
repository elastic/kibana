/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { Meta, StoryFn, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { Tab, type TabProps } from '../tab';
import { servicesMock } from '../../../__mocks__/services';
import { getPreviewDataMock } from '../../../__mocks__/get_preview_data';
import { MAX_TAB_WIDTH, MIN_TAB_WIDTH } from '../../constants';

const asyncAction =
  (name: string) =>
  async (...params: any[]) => {
    action(name)(...params);
  };

export default {
  title: 'Unified Tabs/Tab',
  parameters: {
    backgrounds: {
      default: 'white',
      values: [{ name: 'white', value: '#fff' }],
    },
  },
} as Meta;

const tabsSizeConfig = {
  isScrollable: false,
  regularTabMaxWidth: MAX_TAB_WIDTH,
  regularTabMinWidth: MIN_TAB_WIDTH,
};

const TabTemplate: StoryFn<TabProps> = (args) => (
  <div role="tablist">
    <Tab
      {...args}
      tabsSizeConfig={tabsSizeConfig}
      getPreviewData={getPreviewDataMock}
      services={servicesMock}
      onLabelEdited={asyncAction('onLabelEdited')}
      onSelect={asyncAction('onSelect')}
      onClose={asyncAction('onClose')}
    />
  </div>
);

export const Default: StoryObj<TabProps> = {
  render: TabTemplate,

  args: {
    item: {
      id: '1',
      label: 'Tab 1',
    },
    isSelected: false,
  },
};

export const Selected: StoryObj<TabProps> = {
  render: TabTemplate,

  args: {
    item: {
      id: '1',
      label: 'Tab 1',
    },
    isSelected: true,
  },
};

export const WithLongLabel: StoryObj<TabProps> = {
  render: TabTemplate,

  args: {
    item: {
      id: '1',
      label: 'Tab with a very long label that should be truncated',
    },
    isSelected: false,
  },
};

export const WithLongLabelSelected: StoryObj<TabProps> = {
  render: TabTemplate,

  args: {
    item: {
      id: '1',
      label: 'Tab with a very long label that should be truncated',
    },
    isSelected: true,
  },
};
