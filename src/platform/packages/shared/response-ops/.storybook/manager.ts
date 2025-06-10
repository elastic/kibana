/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming';
import { PANEL_ID } from '@storybook/addon-actions';

addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'Response Ops Components',
  }),
  showPanel: true,
  selectedPanel: PANEL_ID,
});
