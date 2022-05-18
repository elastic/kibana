/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { addons, types } from '@storybook/addons';
import { ThemeSwitcher } from './theme_switcher';

export const THEME_SWITCHER_ADDON_ID = 'kibana/eui-theme-switcher';

export function registerThemeSwitcherAddon() {
  addons.register(THEME_SWITCHER_ADDON_ID, (api) => {
    const channel = api.getChannel();

    channel.on('globalsUpdated', ({ globals }) => {
      const previewFrame = document.getElementById(
        'storybook-preview-iframe'
      ) as HTMLIFrameElement | null;
      const stylesheet = previewFrame?.contentDocument?.getElementById(
        'eui-theme-css'
      ) as HTMLLinkElement | null;

      if (stylesheet && globals.euiTheme) {
        stylesheet.href = `kbn-ui-shared-deps-npm.${globals.euiTheme}.css`;
      }
    });

    addons.add(THEME_SWITCHER_ADDON_ID, {
      title: 'EUI Theme Switcher',
      type: types.TOOL,
      match: ({ viewMode }) => !!(viewMode && viewMode.match(/^(story|docs)$/)),
      render: ThemeSwitcher,
    });
  });
}
