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
        run: action('exit-edit-clicked'),
        id: 'exitEdit',
        label: 'exit edit',
        testId: 'exitEditButton',
        iconType: 'exit', // use 'logOut' when added to EUI
      },
      {
        run: action('export-clicked'),
        id: 'export',
        label: 'export',
        testId: 'exportButton',
        iconType: 'download',
      },
      {
        run: action('share-clicked'),
        id: 'share',
        label: 'share',
        testId: 'shareButton',
        iconType: 'share',
      },
    ],
    secondaryActionItem: {
      run: action('add-clicked'),
      id: 'add',
      label: 'add',
      testId: 'addButton',
      iconType: 'plusInCircle',
      color: 'success',
    },
    primaryActionItem: {
      run: action('save-clicked'),
      id: 'save',
      label: 'save',
      testId: 'saveButton',
      iconType: 'save',
      color: 'text',
      splitButtonProps: {
        run: action('add-split-clicked'),
        secondaryButtonAriaLabel: 'Save options',
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
      'You have unsaved changes in this dashboard. To remove this label, save the dashboard.',
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
