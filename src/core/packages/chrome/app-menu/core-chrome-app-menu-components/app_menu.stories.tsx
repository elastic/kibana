/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiFlexGroup, EuiHeader, EuiPageTemplate } from '@elastic/eui';
import { AppMenuComponent } from '.';
import type { AppMenuConfig } from '.';

type AppMenuWrapperProps = ComponentProps<typeof AppMenuComponent>;

const AppMenuWrapper = (props: AppMenuWrapperProps) => {
  return (
    <EuiHeader>
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
        <AppMenuComponent {...props} />
      </EuiFlexGroup>
    </EuiHeader>
  );
};

const meta: Meta<AppMenuWrapperProps> = {
  title: 'Chrome/App Menu',
  component: AppMenuWrapper,
  decorators: [
    (Story) => {
      return (
        <EuiPageTemplate>
          <Story />
        </EuiPageTemplate>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        component: 'AppMenu is the new design of app menu.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<AppMenuWrapperProps>;

const dashboardEditModeConfig: AppMenuConfig = {
  items: [
    {
      id: 'add',
      order: 0,
      label: 'add',
      testId: 'addButton',
      iconType: 'plus',
      popoverWidth: 200,
      items: [
        {
          run: () => action('create-visualization-clicked'),
          order: 1,
          id: 'createVisualization',
          label: 'Visualization',
          iconType: 'lensApp',
          testId: 'createNewVisButton',
        },
        {
          run: () => action('new-panel-clicked'),
          id: 'newPanel',
          order: 2,
          label: 'New panel',
          iconType: 'plusCircle',
          testId: 'openAddPanelFlyoutButton',
        },
        {
          run: () => action('add-section-clicked'),
          id: 'collapsibleSection',
          order: 3,
          label: 'Collapsible section',
          iconType: 'section',
          testId: 'addCollapsibleSectionButton',
        },
        {
          id: 'controls',
          order: 4,
          label: 'Controls',
          iconType: 'controls',
          testId: 'controls-menu-button',
          items: [
            {
              run: () => action('control-clicked'),
              id: 'control',
              order: 1,
              label: 'control',
              testId: 'controlButton',
            },
            {
              run: () => action('variable-control-clicked'),
              id: 'variableControl',
              order: 2,
              label: 'variable control',
              testId: 'variableControlButton',
            },
            {
              run: () => action('time-slider-control-clicked'),
              id: 'timeSliderControl',
              order: 3,
              label: 'time slider control',
              testId: 'timeSliderControlButton',
            },
            {
              run: () => action('setting-clicked'),
              id: 'settings',
              order: 4,
              label: 'settings',
              testId: 'settingButton',
              separator: 'above',
            },
          ],
        },
        {
          run: () => action('add-from-library-clicked'),
          id: 'fromLibrary',
          order: 5,
          label: 'From library',
          iconType: 'folderOpen',
          testId: 'addFromLibraryButton',
        },
      ],
    },
    {
      run: action('exit-edit-clicked'),
      id: 'exitEdit',
      order: 1,
      label: 'exit edit',
      testId: 'exitEditButton',
      iconType: 'logOut',
    },
    {
      id: 'export',
      order: 2,
      label: 'export',
      testId: 'exportButton',
      iconType: 'upload',
      popoverWidth: 150,
      items: [
        {
          run: () => action('export-pdf-clicked'),
          id: 'exportPDF',
          order: 1,
          label: 'PDF reports',
          iconType: 'document',
          testId: 'exportPDFButton',
        },
        {
          run: () => action('export-png-clicked'),
          id: 'exportPNG',
          order: 2,
          label: 'PNG reports',
          iconType: 'image',
          testId: 'exportPNGButton',
        },
        {
          run: () => action('export-csv-clicked'),
          id: 'exportCSV',
          order: 3,
          label: 'CSV reports',
          iconType: 'upload',
          testId: 'exportCSVButton',
        },
      ],
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
  primaryActionItem: {
    run: action('save-clicked'),
    id: 'save',
    label: 'save',
    testId: 'saveButton',
    iconType: 'save',
    popoverWidth: 150,
    splitButtonProps: {
      secondaryButtonAriaLabel: 'Save options',
      secondaryButtonIcon: 'chevronSingleDown',
      notifcationIndicatorTooltipContent: 'You have unsaved changes',
      showNotificationIndicator: true,
      items: [
        {
          run: () => action('save-option-clicked'),
          id: 'saveAs',
          order: 1,
          label: 'Save as',
          iconType: 'save',
          testId: 'interactiveSaveMenuItem',
        },
        {
          run: () => action('discard-changes-clicked'),
          id: 'resetChanges',
          order: 2,
          label: 'Reset changes',
          iconType: 'undo',
          testId: 'discardChangesMenuItem',
        },
      ],
    },
  },
};

/**
 * The configuration mimics the editModeTopNavConfig from Dashboard application.
 */
export const DashboardEditModeConfig: Story = {
  name: 'Dashboard edit mode',
  args: {
    config: dashboardEditModeConfig,
  },
};

const standaloneForcedOverflowConfig: AppMenuConfig = {
  items: [
    {
      run: action('only-overflow-item-clicked'),
      id: 'standaloneOverflowItem',
      order: 1,
      overflow: true,
      label: 'Overflow item',
      testId: 'standaloneOverflowItemButton',
      iconType: 'gear',
    },
  ],
};

export const StandaloneForcedOverflow: Story = {
  name: 'Forced overflow',
  args: {
    config: standaloneForcedOverflowConfig,
  },
};

const overflowAndOrderingConfig: AppMenuConfig = {
  items: [
    {
      id: 'item6',
      order: 6,
      label: 'Item 6 (order 6)',
      run: action('item-6-clicked'),
      iconType: 'gear',
      testId: 'item6Button',
    },
    {
      id: 'item1ForcedOverflow',
      order: 1,
      overflow: true,
      label: 'Item 1 forced overflow (order 1)',
      run: action('item-1-forced-overflow-clicked'),
      iconType: 'gear',
      testId: 'item1ForcedOverflowButton',
    },
    {
      id: 'item4',
      order: 4,
      label: 'Item 4 (order 4)',
      run: action('item-4-clicked'),
      iconType: 'gear',
      testId: 'item4Button',
    },
    {
      id: 'item2',
      order: 2,
      label: 'Item 2 (order 2)',
      run: action('item-2-clicked'),
      iconType: 'gear',
      testId: 'item2Button',
    },
    {
      id: 'item5',
      order: 5,
      label: 'Item 5 (order 5)',
      run: action('item-5-clicked'),
      iconType: 'gear',
      testId: 'item5Button',
      separator: 'below',
    },
    {
      id: 'item3',
      order: 3,
      label: 'Item 3 (order 3)',
      run: action('item-3-clicked'),
      iconType: 'gear',
      testId: 'item3Button',
    },
  ],
};

export const OverflowAndOrdering: Story = {
  name: 'Overflow and ordering',
  args: {
    config: overflowAndOrderingConfig,
  },
};
