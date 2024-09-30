/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, useState } from 'react';
import { EuiFlyout, EuiForm, EuiPage, isColorDark } from '@elastic/eui';
import { ComponentStory } from '@storybook/react';
import { css } from '@emotion/react';
import { CategoricalColorMapping, ColorMappingProps } from '../categorical_color_mapping';
import { AVAILABLE_PALETTES, getPalette, NeutralPalette } from '../palettes';
import { DEFAULT_COLOR_MAPPING_CONFIG } from '../config/default_color_mapping';
import { ColorMapping } from '../config';
import { getColorFactory } from '../color/color_handling';
import { ruleMatch } from '../color/rule_matching';
import { getValidColor } from '../color/color_math';

export default {
  title: 'Color Mapping',
  component: CategoricalColorMapping,
  decorators: [(story: Function) => story()],
};

const Template: ComponentStory<FC<ColorMappingProps>> = (args) => {
  const [updatedModel, setUpdateModel] = useState<ColorMapping.Config>(
    DEFAULT_COLOR_MAPPING_CONFIG
  );

  const getPaletteFn = getPalette(AVAILABLE_PALETTES, NeutralPalette);

  const colorFactory = getColorFactory(updatedModel, getPaletteFn, false, args.data);

  return (
    <EuiPage>
      <ol>
        {args.data.type === 'categories' &&
          args.data.categories.map((c, i) => {
            const match = updatedModel.assignments.some(({ rule }) => {
              return ruleMatch(rule, c);
            });
            const color = colorFactory(c);
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
                {c}
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
          <CategoricalColorMapping {...args} onModelUpdate={setUpdateModel} />
        </EuiForm>
      </EuiFlyout>
    </EuiPage>
  );
};
export const Default = Template.bind({});

Default.args = {
  model: {
    ...DEFAULT_COLOR_MAPPING_CONFIG,

    colorMode: {
      type: 'categorical',
    },
    specialAssignments: [
      {
        rule: {
          type: 'other',
        },
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

  palettes: AVAILABLE_PALETTES,
  specialTokens: new Map(),
  // eslint-disable-next-line no-console
  onModelUpdate: (model) => console.log(model),
};
