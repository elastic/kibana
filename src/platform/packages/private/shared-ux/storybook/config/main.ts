/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defaultConfig } from '@kbn/storybook';

const modifiedConfig = {
  ...defaultConfig,
  addons: [...(defaultConfig.addons ?? []), '@storybook/addon-docs'],
};

module.exports = {
  ...modifiedConfig,
  stories: [
    '../../**/*.stories.+(tsx|mdx)',
    '../../../../shared/shared-ux/**/*.stories.+(tsx|mdx)',
    '../../../../shared/shared-ux/**/guide.mdx',
    '../../../../../../core/packages/chrome/**/*.stories.+(tsx|mdx)',
  ],
};
