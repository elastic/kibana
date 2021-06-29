/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { addons, types } from '@storybook/addons';
import { ThemeSwitcher } from './theme_switcher';

export function registerThemeSwitcherAddon() {
  addons.register('kibana/eui-theme-switcher', (api) => {
    const channel = api.getChannel();

    channel.on('globalsUpdated', ({ globals }) => {
      const previewFrame = document.getElementById(
        'storybook-preview-iframe'
      ) as HTMLIFrameElement | null;
      const stylesheet = previewFrame?.contentDocument?.getElementById(
        'eui-theme-css'
      ) as HTMLLinkElement | null;

      if (stylesheet) {
        stylesheet.href = `kbn-ui-shared-deps.${globals.euiTheme}.css`;
      }
    });

    addons.add('kibana/eui-theme-switcher', {
      title: 'EUI Theme Switcher',
      type: types.TOOL,
      match: ({ viewMode }) => !!(viewMode && viewMode.match(/^(story|docs)$/)),
      render: ThemeSwitcher,
    });
  });
}
