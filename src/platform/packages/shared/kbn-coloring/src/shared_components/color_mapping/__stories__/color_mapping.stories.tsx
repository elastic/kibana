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
import type { StoryFn } from '@storybook/react';
import { css } from '@emotion/react';
import { RawValue, deserializeField } from '@kbn/data-plugin/common';
import { CategoricalColorMapping, ColorMappingProps } from '../categorical_color_mapping';
import { DEFAULT_COLOR_MAPPING_CONFIG } from '../config/default_color_mapping';
import { ColorMapping } from '../config';
import { getColorFactory } from '../color/color_handling';
import { getValidColor } from '../color/color_math';

export default {
  title: 'Color Mapping',
  component: CategoricalColorMapping,
  decorators: [(story: Function) => story()],
};

const formatter = (value: unknown) => String(value);

const Template: StoryFn<FC<ColorMappingProps>> = (args) => {
  const [updatedModel, setUpdateModel] = useState<ColorMapping.Config>(
    DEFAULT_COLOR_MAPPING_CONFIG
  );

  const palettes = getKbnPalettes({ name: 'amsterdam', darkMode: false });
  const colorFactory = getColorFactory(updatedModel, palettes, false, args.data);

  return (
    <EuiPage>
      <ol>
        {args.data.type === 'categories' &&
          args.data.categories.map((category, i) => {
            const value: RawValue = deserializeField(category);
            const match = updatedModel.assignments.some(({ rules }) =>
              rules.some((r) => (r.type === 'raw' ? r.value === value : false))
            );
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
                {formatter(value)}
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

export const Default = {
  render: Template,

  args: {
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
    data: {
      type: 'categories',
      categories: [
        'US',
        'Mexico',
        'Brasil',
        'Canada',
        'Italy',
        'Germany',
        'France',
        'Spain',
        'UK',
        'Portugal',
        'Greece',
        'Sweden',
        'Finland',
      ],
    },

    specialTokens: new Map(),
    // eslint-disable-next-line no-console
    onModelUpdate: (model: any) => console.log(model),
  },
};
