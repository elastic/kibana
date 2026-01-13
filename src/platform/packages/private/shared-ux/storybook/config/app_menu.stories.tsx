/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiFlexGroup, EuiFlexItem, EuiHeader, EuiPageTemplate, useEuiTheme } from '@elastic/eui';
import { UnifiedTabs, useNewTabProps, type TabItem } from '@kbn/unified-tabs';
import { TabStatus, type TabPreviewData } from '@kbn/unified-tabs';
import { css } from '@emotion/react';
import { AppMenuComponent } from '@kbn/core-chrome-app-menu-components';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';

interface AppMenuWrapperProps extends ComponentProps<typeof AppMenuComponent> {
  showTabs?: boolean;
}

const VerticalRule = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <span
      style={{
        width: euiTheme.border.width.thin,
        height: '28px',
        backgroundColor: euiTheme.colors.borderBasePlain,
      }}
    />
  );
};

const AppMenuWrapper = ({ showTabs = false, ...props }: AppMenuWrapperProps) => {
  const { euiTheme } = useEuiTheme();
  const { getNewTabDefaultProps } = useNewTabProps({ numberOfInitialItems: 0 });

  const [tabsState, setTabsState] = useState<{
    managedItems: TabItem[];
    managedSelectedItemId?: string;
  }>(() => ({
    managedItems: Array.from({ length: 3 }, () => getNewTabDefaultProps()),
    managedSelectedItemId: undefined,
  }));

  const mockServices = {
    i18n: {
      Context: ({ children }: { children: ReactNode }) => <>{children}</>,
    },
    analytics: {
      reportEvent: action('analytics-event'),
    },
  };

  const getPreviewData = (item: TabItem): TabPreviewData => {
    const index = tabsState.managedItems.findIndex((i) => i.id === item.id);
    const states = [
      { status: TabStatus.SUCCESS, query: { language: 'kql', query: 'status:200' } },
      {
        status: TabStatus.ERROR,
        query: { esql: 'FROM logs-* | WHERE @timestamp > NOW() - 1 hour' },
      },
    ];
    return states[index % states.length];
  };

  const content = showTabs ? (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      wrap={false}
      responsive={false}
      css={css`
        width: 100%;
      `}
    >
      <EuiFlexItem
        grow={true}
        css={css`
          min-width: 0;
          overflow: hidden;
        `}
      >
        <UnifiedTabs
          items={tabsState.managedItems}
          selectedItemId={tabsState.managedSelectedItemId}
          recentlyClosedItems={[]}
          onClearRecentlyClosed={action('clear-recently-closed')}
          maxItemsCount={25}
          services={mockServices as any}
          onChanged={(updatedState) => {
            action('tabs-changed')(updatedState);
            setTabsState({
              managedItems: updatedState.items,
              managedSelectedItemId: updatedState.selectedItem?.id,
            });
          }}
          createItem={getNewTabDefaultProps}
          getPreviewData={getPreviewData}
          onEBTEvent={action('tabs-ebt-event')}
        />
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        css={css`
          flex-shrink: 0;
        `}
      >
        <VerticalRule />
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        css={css`
          flex-shrink: 0;
        `}
      >
        <AppMenuComponent {...props} />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <AppMenuComponent {...props} />
  );

  return (
    <EuiHeader
      css={
        showTabs
          ? css`
              background-color: ${euiTheme.colors.lightestShade};
            `
          : undefined
      }
    >
      {showTabs ? (
        content
      ) : (
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          {content}
        </EuiFlexGroup>
      )}
    </EuiHeader>
  );
};

const meta: Meta<AppMenuWrapperProps> = {
  title: 'Navigation/AppMenu',
  component: AppMenuWrapper,
  argTypes: {
    showTabs: {
      control: 'boolean',
      description: 'Show or hide the Unified Tabs integration',
      defaultValue: false,
    },
  },
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
      run: action('exit-edit-clicked'),
      id: 'exitEdit',
      order: 1,
      label: 'exit edit',
      testId: 'exitEditButton',
      iconType: 'exit', // use 'logOut' when added to EUI
    },
    {
      id: 'export',
      order: 2,
      label: 'export',
      testId: 'exportButton',
      iconType: 'exportAction',
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
          iconType: 'exportAction',
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
  secondaryActionItem: {
    id: 'add',
    label: 'add',
    testId: 'addButton',
    iconType: 'plusInCircle',
    color: 'success',
    minWidth: false,
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
        iconType: 'plusInCircle',
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
        iconType: 'controlsHorizontal',
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
  primaryActionItem: {
    run: action('save-clicked'),
    id: 'save',
    label: 'save',
    testId: 'saveButton',
    iconType: 'save',
    popoverWidth: 150,
    splitButtonProps: {
      secondaryButtonAriaLabel: 'Save options',
      secondaryButtonIcon: 'arrowDown',
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
          iconType: 'editorUndo',
          testId: 'discardChangesMenuItem',
        },
      ],
    },
  },
};

const discoverConfig: AppMenuConfig = {
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
      id: 'alerts',
      order: 4,
      label: 'alerts',
      testId: 'alertsButton',
      iconType: 'alert',
      popoverWidth: 250,
      items: [
        {
          run: () => action('create-search-threshold-rule-clicked'),
          id: 'createSearchThresholdRule',
          order: 1,
          label: 'create search threshold rule',
          iconType: 'bell',
          testId: 'createSearchThresholdRuleButton',
        },
        {
          run: () => action('manage-rules-and-connectors-clicked'),
          id: 'manageRulesAndConnectors',
          order: 2,
          label: 'manage rules and connectors',
          iconType: 'tableOfContents',
          testId: 'manageRulesAndConnectorsButton',
        },
      ],
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
    popoverWidth: 150,
    splitButtonProps: {
      secondaryButtonAriaLabel: 'Save options',
      secondaryButtonIcon: 'arrowDown',
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
          iconType: 'editorUndo',
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

/**
 * The configuration mimics the app menu bar from Discover application.
 */
export const DiscoverConfig: Story = {
  name: 'Discover',
  args: {
    config: discoverConfig,
    showTabs: true,
  },
};
