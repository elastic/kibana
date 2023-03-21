/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const { addons } = require('@storybook/addons');
const { create } = require('@storybook/theming');
const { PANEL_ID } = require('@storybook/addon-actions');

addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'Content Management Storybook',
  }),
  showPanel: () => true,
  selectedPanel: PANEL_ID,
});
