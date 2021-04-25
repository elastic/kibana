/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { addons, types } from '@storybook/addons';
import { create } from '@storybook/theming';
import { ThemeSwitcher } from './theme_switcher';

// This configures the "Manager", or main outer view of Storybook. It is an
// addon that's loaded by the `managerEntries` part of the preset in ../preset.js.
addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'Kibana Storybook',
    brandUrl: 'https://github.com/elastic/kibana/tree/master/packages/kbn-storybook',
  }),
  showPanel: false,
  isFullscreen: false,
  panelPosition: 'bottom',
  isToolshown: true,
});

addons.register('kibana/eui-theme-switcher', (api) => {
  const channel = api.getChannel();
  channel.on('globalsUpdated', ({ globals }) => {
    console.log({ globals });
    const stylesheet = document.getElementById('eui-theme-css');
    console.log((stylesheet as HTMLLinkElement | null)?.href);
    debugger;
  });

  addons.add('kibana/eui-theme-switcher', {
    title: 'EUI Theme Switcher',
    type: types.TOOL,
    match: ({ viewMode }) => !!(viewMode && viewMode.match(/^(story|docs)$/)),
    render: ThemeSwitcher,
  });
});
