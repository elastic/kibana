/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { StorybookConfig } from '@storybook/core/types';

export const defaultConfig: StorybookConfig = {
  addons: ['@kbn/storybook/preset', '@storybook/addon-a11y', '@storybook/addon-essentials'],
  stories: ['../**/*.stories.tsx'],
  typescript: {
    reactDocgen: false,
  },
};
