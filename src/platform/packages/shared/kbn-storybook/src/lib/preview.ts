/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Preview } from '@storybook/react';

const preview: Preview = {
  globalTypes: {
    euiTheme: {
      description: 'Elastic theme',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          {
            value: 'v8.light',
            icon: 'hearthollow',
            title: 'Light',
          },
          {
            value: 'v8.dark',
            icon: 'heart',
            title: 'Dark',
          },
        ],
      },
    },
  },
  initialGlobals: {
    theme: 'v8.light',
  },
  tags: ['autodocs'],
};

// eslint-disable-next-line import/no-default-export
export default preview;
