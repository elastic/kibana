/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import type { Meta, StoryFn, StoryObj } from '@storybook/react';
import { Provider } from 'react-redux';

import { Global, css } from '@emotion/react';

import { createStore } from '@kbn/core-workspace-chrome-state';

import {
  LOGO,
  PRIMARY_MENU_FOOTER_ITEMS,
  PRIMARY_MENU_ITEMS,
} from '@kbn/core-chrome-navigation/src/mocks/observability';

import { WorkspaceChrome as Component } from '../workspace_chrome';

const styles = css`
  body.sb-show-main.sb-main-padded {
    padding: 0;
    overflow-x: hidden;
    min-width: 100%;
    min-height: 100%;
  }
`;

const PreventLinkNavigation = (Story: StoryFn) => {
  useEffect(() => {
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');

      if (anchor && anchor.getAttribute('href')) {
        e.preventDefault();
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return <Story />;
};
export default {
  title: 'Chrome/Workspace Chrome',
  component: Component,
  decorators: [
    PreventLinkNavigation,
    (Story) => {
      const store = createStore();

      return (
        <Provider store={store}>
          <Global styles={styles} />
          <Story />
        </Provider>
      );
    },
  ],
} as Meta;

export const WorkspaceChrome: StoryObj = {
  render: () => (
    <Component>
      <Component.Header />
      <Component.Navigation
        items={{ primaryItems: PRIMARY_MENU_ITEMS, footerItems: PRIMARY_MENU_FOOTER_ITEMS }}
        logo={LOGO}
        navigateToUrl={() => {}}
      />
      <Component.SidebarPanel apps={[]} />
    </Component>
  ),
};
