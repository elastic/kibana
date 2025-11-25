/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentProps } from 'react';
import React, { useCallback, useRef, useState } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import type { MountPoint } from '@kbn/core/public';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import {
  EuiContextMenu,
  EuiFlexGroup,
  EuiHeader,
  EuiPageTemplate,
  EuiWrappingPopover,
} from '@elastic/eui';
import type { TopNavMenuConfigBeta } from './types';
import { TopNavMenuBeta } from './top_nav_menu_beta';

const PopoverMock = ({
  anchorElement,
  items,
  onClose,
}: {
  anchorElement: HTMLElement;
  items: EuiContextMenuPanelItemDescriptor[];
  onClose: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => {
      onClose();
    }, 100);
  }, [onClose]);

  const panels = [
    {
      id: 0,
      initialFocusedItemIndex: 0,
      items,
    },
  ];

  return (
    <EuiWrappingPopover
      isOpen={isOpen}
      closePopover={handleClose}
      button={anchorElement}
      panelPaddingSize="none"
      anchorPosition="downRight"
      attachToAnchor
      buffer={0}
      repositionOnScroll
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiWrappingPopover>
  );
};

const renderPopoverMock = (
  anchorElement: HTMLElement,
  items: EuiContextMenuPanelItemDescriptor[]
) => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const cleanup = () => {
    unmountComponentAtNode(container);
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  };

  render(
    <PopoverMock anchorElement={anchorElement} items={items} onClose={cleanup} />,

    container
  );

  return cleanup;
};

const TopNavMenuBetaWrapper = (props: ComponentProps<typeof TopNavMenuBeta>) => {
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
      <EuiPageTemplate>
        <EuiHeader>
          <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
            <Story />
          </EuiFlexGroup>
        </EuiHeader>
      </EuiPageTemplate>
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

const dashboardEditModeConfig: TopNavMenuConfigBeta = {
  items: [
    {
      run: action('exit-edit-clicked'),
      id: 'exitEdit',
      order: 1,
      label: 'exit edit',
      testId: 'exitEditButton',
      iconType: 'exit', // use 'logOut' when added to EUI
    },
    {
      run: (anchorElement) => {
        renderPopoverMock(anchorElement, [
          {
            name: 'PDF reports',
            icon: 'document',
            'data-test-subj': 'exportPDFButton',
            onClick: () => action('export-pdf-clicked'),
          },
          {
            name: 'PNG reports',
            icon: 'image',
            'data-test-subj': 'exportPNGButton',
            onClick: () => action('export-png-clicked'),
          },
          {
            name: 'CSV reports',
            icon: 'exportAction',
            'data-test-subj': 'exportCSVButton',
            onClick: () => action('export-csv-clicked'),
          },
        ]);
      },
      id: 'export',
      order: 2,
      label: 'export',
      testId: 'exportButton',
      iconType: 'download',
    },
    {
      run: action('share-clicked'),
      id: 'share',
      order: 3,
      label: 'share',
      testId: 'shareButton',
      iconType: 'share',
    },
    {
      run: action('settings-clicked'),
      id: 'settings',
      order: 4,
      label: 'settings',
      testId: 'settingsButton',
      iconType: 'gear',
    },
    {
      run: action('background-searches-clicked'),
      id: 'backgroundSearches',
      order: 4,
      label: 'background searches',
      testId: 'backgroundSearchesButton',
      iconType: 'backgroundTask',
    },
  ],
  secondaryActionItem: {
    run: (anchorElement) => {
      renderPopoverMock(anchorElement, [
        {
          name: 'Visualization',
          icon: 'lensApp',
          'data-test-subj': 'createNewVisButton',
          onClick: () => action('create-visualization-clicked'),
        },
        {
          name: 'New panel',
          icon: 'plusInCircle',
          'data-test-subj': 'openAddPanelFlyoutButton',
          onClick: () => action('new-panel-clicked'),
        },
        {
          name: 'Collapsible section',
          icon: 'section',
          'data-test-subj': 'addCollapsibleSectionButton',
          onClick: () => action('add-section-clicked'),
        },
        {
          name: 'Controls',
          icon: 'controlsHorizontal',
          'data-test-subj': 'controls-menu-button',
          panel: 1,
        },
        {
          name: 'From library',
          'data-test-subj': 'addFromLibraryButton',
          icon: 'folderOpen',
          onClick: () => action('add-from-library-clicked'),
        },
      ]);
    },
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
    splitButtonProps: {
      run: (anchorElement) => {
        renderPopoverMock(anchorElement, [
          {
            name: 'Save as',
            icon: 'save',
            'data-test-subj': 'interactiveSaveMenuItem',
            onClick: () => action('save-option-clicked'),
          },
          {
            name: 'Reset changes',
            icon: 'editorUndo',
            'data-test-subj': 'discardChangesMenuItem',
            onClick: () => action('discard-changes-clicked'),
          },
        ]);
      },
      secondaryButtonAriaLabel: 'Save options',
      secondaryButtonIcon: 'arrowDown',
    },
  },
};

const discoverConfig: TopNavMenuConfigBeta = {
  items: [
    {
      run: action('new-clicked'),
      id: 'new',
      order: 1,
      label: 'new',
      testId: 'newButton',
      iconType: 'plusInCircle',
    },
    {
      run: action('open-clicked'),
      id: 'open',
      order: 2,
      label: 'open',
      testId: 'openButton',
      iconType: 'folderOpen',
    },
    {
      run: action('share-clicked'),
      id: 'share',
      order: 3,
      label: 'share',
      testId: 'shareButton',
      iconType: 'share',
    },
    {
      run: action('alerts-clicked'),
      id: 'alerts',
      order: 4,
      label: 'alerts',
      testId: 'alertsButton',
      iconType: 'warning',
    },
    {
      run: action('datasets-clicked'),
      id: 'datasets',
      order: 5,
      label: 'data sets',
      testId: 'datasetsButton',
      iconType: 'database',
    },
    {
      run: action('background-searches-clicked'),
      id: 'backgroundSearches',
      order: 6,
      label: 'background searches',
      testId: 'backgroundSearchesButton',
      iconType: 'backgroundTask',
    },
  ],
  primaryActionItem: {
    run: action('save-clicked'),
    id: 'saved',
    label: 'Save',
    testId: 'saveButton',
    iconType: 'save',
    splitButtonProps: {
      run: (anchorElement) => {
        renderPopoverMock(anchorElement, [
          {
            name: 'Save as',
            icon: 'save',
            'data-test-subj': 'interactiveSaveMenuItem',
            onClick: () => action('save-option-clicked'),
          },
          {
            name: 'Reset changes',
            icon: 'editorUndo',
            'data-test-subj': 'discardChangesMenuItem',
            onClick: () => action('discard-changes-clicked'),
          },
        ]);
      },
      secondaryButtonAriaLabel: 'Save options',
      secondaryButtonIcon: 'arrowDown',
    },
  },
};

/**
 * The configuration mimics the editModeTopNavConfig from Dashboard application.
 */
export const DashboardEditModeConfig: Story = {
  args: {
    config: dashboardEditModeConfig,
    visible: true,
    showSearchBar: false,
  },
};

/**
 * The configuration mimics the app menu bar from Discover application.
 */
export const DiscoverConfig: Story = {
  name: 'Discover config',
  args: {
    config: discoverConfig,
    visible: true,
    showSearchBar: true,
  },
};
