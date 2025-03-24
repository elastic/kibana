/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Preview } from '@storybook/react';
import * as jest from 'jest-mock';
import { decorators } from './decorators';
import {
  AMSTERDAM_DARK,
  AMSTERDAM_LIGHT,
  BOREALIS_DARK,
  BOREALIS_LIGHT,
  DEFAULT_THEME,
  THEME_TITLES,
} from './themes';

// @ts-expect-error
window.jest = jest;

const preview: Preview = {
  decorators,
  initialGlobals: { euiTheme: DEFAULT_THEME },
  globalTypes: {
    euiTheme: {
      description: 'Change the EUI theme',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        dynamicTitle: true,
        items: [
          {
            value: BOREALIS_LIGHT,
            icon: 'hearthollow',
            title: THEME_TITLES[BOREALIS_LIGHT],
          },
          {
            value: BOREALIS_DARK,
            icon: 'heart',
            title: THEME_TITLES[BOREALIS_DARK],
          },
          {
            value: AMSTERDAM_LIGHT,
            icon: 'hearthollow',
            title: THEME_TITLES[AMSTERDAM_LIGHT],
          },
          {
            value: AMSTERDAM_DARK,
            icon: 'heart',
            title: THEME_TITLES[AMSTERDAM_DARK],
          },
        ],
      },
    },
  },
};

// eslint-disable-next-line import/no-default-export
export default preview;
