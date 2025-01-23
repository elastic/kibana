/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, useState } from 'react';
import { getKbnPalettes } from '@kbn/palettes';
import { EuiFlyout, EuiForm, EuiPage, isColorDark } from '@elastic/eui';
import { ComponentStory } from '@storybook/react';
import { css } from '@emotion/react';
import {
  MultiFieldKey,
  RawValue,
  SerializedValue,
  deserializeField,
} from '@kbn/data-plugin/common';
import { getColorCategories } from '@kbn/chart-expressions-common';
import { IFieldFormat } from '@kbn/field-formats-plugin/common';
import { CategoricalColorMapping, ColorMappingProps } from '../categorical_color_mapping';
import { DEFAULT_COLOR_MAPPING_CONFIG } from '../config/default_color_mapping';
import { ColorMapping } from '../config';
import { getColorFactory } from '../color/color_handling';
import { assignmentMatchFn } from '../color/rule_matching';
import { getValidColor } from '../color/color_math';

export default {
  title: 'Raw Color Mapping',
  component: CategoricalColorMapping,
  decorators: [(story: Function) => story()],
};

const formatter = {
  convert: (value: MultiFieldKey) => {
    return value.keys.join(' - ');
  },
} as IFieldFormat;

const Template: ComponentStory<FC<ColorMappingProps>> = (args) => {
  const [updatedModel, setUpdateModel] = useState<ColorMapping.Config>(
    DEFAULT_COLOR_MAPPING_CONFIG
  );

  const palettes = getKbnPalettes({ name: 'amsterdam', darkMode: false });
  const colorFactory = getColorFactory(updatedModel, palettes, false, args.data);

  return (
    <EuiPage>
      <ol>
        {args.data.type === 'categories' &&
          args.data.categories.map((category: SerializedValue, i) => {
            const value: RawValue = deserializeField(category);
            const match = updatedModel.assignments.some(assignmentMatchFn(value));
            const color = colorFactory(value);
            const isDark = isColorDark(...getValidColor(color).rgb());

            return (
              <li
                key={i}
                css={css`
                  width: ${100 + 200 * Math.abs(Math.cos(i))}px;
                  height: 30px;
                  margin: 2px;
                  padding: 5px;
                  background: ${color};
                  color: ${isDark ? 'white' : 'black'};
                  border: ${match ? '2px solid black' : 'none'};
                  font-weight: ${match ? 'bold' : 'normal'};
                `}
              >
                {formatter.convert(value)}
              </li>
            );
          })}
      </ol>
      <EuiFlyout
        style={{ width: 350, minInlineSize: 366, padding: '8px', overflow: 'auto' }}
        onClose={() => {}}
        hideCloseButton
        ownFocus={false}
      >
        <EuiForm>
          <CategoricalColorMapping {...args} palettes={palettes} onModelUpdate={setUpdateModel} />
        </EuiForm>
      </EuiFlyout>
    </EuiPage>
  );
};
export const Default = Template.bind({});

Default.args = {
  model: {
    ...DEFAULT_COLOR_MAPPING_CONFIG,
    paletteId: 'eui_amsterdam',

    colorMode: {
      type: 'categorical',
    },
    specialAssignments: [
      {
        rules: [
          {
            type: 'other',
          },
        ],
        color: {
          type: 'loop',
        },
        touched: false,
      },
    ],
    assignments: [],
  },
  isDarkMode: false,
  formatter,
  data: {
    type: 'categories',
    categories: getColorCategories(
      [
        { value: new MultiFieldKey({ key: ['US', 'Canada'] }) },
        { value: new MultiFieldKey({ key: ['Mexico'] }) },
        { value: new MultiFieldKey({ key: ['Brasil'] }) },
        { value: new MultiFieldKey({ key: ['Canada'] }) },
        { value: new MultiFieldKey({ key: ['Canada', 'US'] }) },
        { value: new MultiFieldKey({ key: ['Italy', 'Germany'] }) },
        { value: new MultiFieldKey({ key: ['France'] }) },
        { value: new MultiFieldKey({ key: ['Spain', 'Portugal'] }) },
        { value: new MultiFieldKey({ key: ['UK'] }) },
        { value: new MultiFieldKey({ key: ['Sweden'] }) },
        { value: new MultiFieldKey({ key: ['Sweden', 'Finland'] }) },
      ],
      'value'
    ),
  },

  specialTokens: new Map(),
  // eslint-disable-next-line no-console
  onModelUpdate: (model) => console.log(model),
};
