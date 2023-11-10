/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { EuiFlyout, EuiForm } from '@elastic/eui';
import { ComponentStory } from '@storybook/react';
import { CategoricalColorMapping, ColorMappingProps } from '../categorical_color_mapping';
import { AVAILABLE_PALETTES } from '../palettes';
import { DEFAULT_COLOR_MAPPING_CONFIG } from '../config/default_color_mapping';

export default {
  title: 'Color Mapping',
  component: CategoricalColorMapping,
  decorators: [
    (story: Function) => (
      <EuiFlyout style={{ width: 350, padding: '8px' }} onClose={() => {}} hideCloseButton>
        <EuiForm>{story()}</EuiForm>
      </EuiFlyout>
    ),
  ],
};

const Template: ComponentStory<FC<ColorMappingProps>> = (args) => (
  <CategoricalColorMapping {...args} />
);

export const Default = Template.bind({});

Default.args = {
  model: {
    ...DEFAULT_COLOR_MAPPING_CONFIG,
    assignmentMode: 'manual',
    colorMode: {
      type: 'gradient',
      steps: [
        {
          type: 'categorical',
          colorIndex: 0,
          paletteId: DEFAULT_COLOR_MAPPING_CONFIG.paletteId,
          touched: false,
        },
        {
          type: 'categorical',
          colorIndex: 1,
          paletteId: DEFAULT_COLOR_MAPPING_CONFIG.paletteId,
          touched: false,
        },
        {
          type: 'categorical',
          colorIndex: 2,
          paletteId: DEFAULT_COLOR_MAPPING_CONFIG.paletteId,
          touched: false,
        },
      ],
      sort: 'asc',
    },
    assignments: [
      {
        rule: {
          type: 'matchExactly',
          values: ['this is', 'a multi-line combobox that is very long and that will be truncated'],
        },
        color: {
          type: 'gradient',
        },
        touched: false,
      },
      {
        rule: {
          type: 'matchExactly',
          values: ['b', ['double', 'value']],
        },
        color: {
          type: 'gradient',
        },
        touched: false,
      },
      {
        rule: {
          type: 'matchExactly',
          values: ['c'],
        },
        color: {
          type: 'gradient',
        },
        touched: false,
      },
      {
        rule: {
          type: 'matchExactly',
          values: [
            'this is',
            'a multi-line wrap',
            'combo box',
            'test combo',
            '3 lines',
            ['double', 'value'],
          ],
        },
        color: {
          type: 'gradient',
        },
        touched: false,
      },
    ],
  },
  isDarkMode: false,
  data: {
    type: 'categories',
    categories: [
      'a',
      'b',
      'c',
      'd',
      'this is',
      'a multi-line wrap',
      'combo box',
      'test combo',
      '3 lines',
    ],
  },

  palettes: AVAILABLE_PALETTES,
  specialTokens: new Map(),
  // eslint-disable-next-line no-console
  onModelUpdate: (model) => console.log(model),
};
