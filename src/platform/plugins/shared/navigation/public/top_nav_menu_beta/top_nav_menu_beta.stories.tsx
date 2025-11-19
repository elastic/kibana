/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef } from 'react';

import type { MountPoint } from '@kbn/core/public';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import type { EuiToolTipProps } from '@elastic/eui';
import { EuiFlexGroup, EuiHeader, EuiPageTemplate, EuiProvider } from '@elastic/eui';
import type { TopNavMenuBadgeProps } from '../top_nav_menu/top_nav_menu_badges';
import type { TopNavMenuDataBeta } from '../top_nav_menu/top_nav_menu_data';
import { TopNavMenuBeta } from './top_nav_menu_beta';

const TopNavMenuBetaWrapper = (props: React.ComponentProps<typeof TopNavMenuBeta>) => {
  const mountContainerRef = useRef<HTMLDivElement>(null);

  const setMenuMountPoint = useCallback((mount: MountPoint<HTMLElement> | undefined) => {
    if (mount && mountContainerRef.current) {
      mountContainerRef.current.innerHTML = '';
      const unmount = mount(mountContainerRef.current);
      action('setMenuMountPoint-called')();
      return unmount;
    }
  }, []);

  return (
    <>
      <div ref={mountContainerRef} />
      <TopNavMenuBeta {...props} setMenuMountPoint={setMenuMountPoint} />
    </>
  );
};

const meta: Meta<typeof TopNavMenuBeta> = {
  title: 'Navigation/TopNavMenuBeta',
  component: TopNavMenuBetaWrapper,
  decorators: [
    (Story) => (
      <EuiProvider>
        <EuiPageTemplate>
          <EuiHeader>
            <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
              <Story />
            </EuiFlexGroup>
          </EuiHeader>
        </EuiPageTemplate>
      </EuiProvider>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component: 'TopNavMenuBeta is the new design of app menu.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof TopNavMenuBeta>;

const createEditModeConfig = (): TopNavMenuDataBeta => {
  return {
    items: [
      {
        id: 'settings',
        label: 'Settings',
        run: action('settings-clicked'),
        testId: 'settingsButton',
        disableButton: false,
      },
      {
        id: 'cancel',
        label: 'Exit edit',
        run: action('switch-to-view-clicked'),
        testId: 'switchToViewButton',
        disableButton: false,
      },
      {
        id: 'export',
        label: 'export',
        run: action('export-clicked'),
        testId: 'exportButton',
        disableButton: false,
      },
      {
        id: 'share',
        label: 'share',
        run: action('share-clicked'),
        testId: 'shareButton',
        disableButton: false,
      },
      {
        id: 'add',
        label: 'add',
        run: action('share-clicked'),
        testId: 'shareButton',
        disableButton: false,
      },
    ],
    actionItem: {
      id: 'save',
      label: 'Save',
      run: action('add-clicked'),
      testId: 'addButton',
      splitButtonProps: {
        run: action('add-split-clicked'),
        secondaryButtonAriaLabel: 'Add options',
        isMainButtonDisabled: true,
      },
    },
  };
};

const unsavedChangesBadge: TopNavMenuBadgeProps = {
  badgeText: 'Unsaved changes',
  title: '',
  color: '#F6E58D',
  toolTipProps: {
    content:
      ' You have unsaved changes in this dashboard. To remove this label, save the dashboard.',
    position: 'bottom',
  } as EuiToolTipProps,
};

/**
 * The configuration mimics the editModeTopNavConfig from Dashboard application.
 */
export const DashboardEditModeConfig: Story = {
  args: {
    badges: [unsavedChangesBadge],
    config: createEditModeConfig(),
    visible: true,
    showSearchBar: false,
  },
};
