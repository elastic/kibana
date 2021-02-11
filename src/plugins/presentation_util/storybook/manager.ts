/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { addons } from '@storybook/addons';
import { create } from '@storybook/theming';
import { PANEL_ID } from '@storybook/addon-actions';

addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'Kibana Presentation Utility Storybook',
    brandUrl: 'https://github.com/elastic/kibana/tree/master/src/plugins/presentation_util',
  }),
  showPanel: true.valueOf,
  selectedPanel: PANEL_ID,
});
