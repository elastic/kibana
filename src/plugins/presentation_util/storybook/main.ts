/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { defaultConfigWebFinal } from '@kbn/storybook';

// We have to do this because the kbn/storybook preset overrides the manager entries,
// so we can't customize the theme.
module.exports = {
  ...defaultConfigWebFinal,
  addons: ['@storybook/addon-a11y', '@storybook/addon-essentials'],
};
