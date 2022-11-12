/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { addons } from '@storybook/addons';
import { PANEL_ID as selectedPanel } from '@storybook/addon-actions';

import { theme } from '@kbn/shared-ux-storybook-theme';

addons.setConfig({
  showPanel: true.valueOf,
  showToolbar: true,
  selectedPanel,
  theme,
});
