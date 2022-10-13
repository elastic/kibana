/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiContextMenu } from '@elastic/eui';

import { SolutionToolbar } from './solution_toolbar';
import { SolutionToolbarPopover } from './items';

import { AddFromLibraryButton, PrimaryActionButton, QuickButtonGroup } from './items';

const quickButtons = [
  {
    createType: 'Text',
    onClick: action('onTextClick'),
    iconType: 'visText',
  },
  {
    createType: 'Control',
    onClick: action('onControlClick'),
    iconType: 'controlsHorizontal',
  },
  {
    createType: 'Link',
    onClick: action('onLinkClick'),
    iconType: 'link',
  },
  {
    createType: 'Image',
    onClick: action('onImageClick'),
    iconType: 'image',
  },
  {
    createType: 'Markup',
    onClick: action('onMarkupClick'),
    iconType: 'visVega',
  },
];

const primaryButtonConfigs = {
  Generic: (
    <PrimaryActionButton label="Primary Action" iconType="apps" onClick={action('generic')} />
  ),
  Canvas: (
    <SolutionToolbarPopover
      label="Add element"
      iconType="plusInCircle"
      panelPaddingSize="none"
      primary={true}
    >
      {() => (
        <EuiContextMenu
          initialPanelId={0}
          panels={[
            {
              id: 0,
              title: 'Open editor',
              items: [
                {
                  name: 'Lens',
                  icon: 'lensApp',
                },
                {
                  name: 'Maps',
                  icon: 'logoMaps',
                },
                {
                  name: 'TSVB',
                  icon: 'visVisualBuilder',
                },
              ],
            },
          ]}
        />
      )}
    </SolutionToolbarPopover>
  ),
  Dashboard: (
    <PrimaryActionButton
      label="Create chart"
      iconType="plusInCircle"
      onClick={action('dashboard')}
    />
  ),
};

const extraButtonConfigs = {
  Generic: undefined,
  Canvas: undefined,
  Dashboard: [
    <SolutionToolbarPopover iconType="visualizeApp" label="All editors" panelPaddingSize="none">
      {() => (
        <EuiContextMenu
          initialPanelId={0}
          panels={[
            {
              id: 0,
              title: 'Open editor',
              items: [
                {
                  name: 'Lens',
                  icon: 'lensApp',
                },
                {
                  name: 'Maps',
                  icon: 'logoMaps',
                },
                {
                  name: 'TSVB',
                  icon: 'visVisualBuilder',
                },
              ],
            },
          ]}
        />
      )}
    </SolutionToolbarPopover>,
  ],
};

export default {
  title: 'Solution Toolbar',
  description: 'A universal toolbar for solutions maintained by the Presentation Team.',
  component: SolutionToolbar,
  argTypes: {
    quickButtonCount: {
      defaultValue: 2,
      control: {
        type: 'number',
        min: 0,
        max: 5,
        step: 1,
      },
    },
    showAddFromLibraryButton: {
      defaultValue: true,
      control: {
        type: 'boolean',
      },
    },
    solution: {
      table: {
        disable: true,
      },
    },
  },
  // https://github.com/storybookjs/storybook/issues/11543#issuecomment-684130442
  parameters: {
    docs: {
      source: {
        type: 'code',
      },
    },
  },
};

const Template: Story<{
  solution: 'Generic' | 'Canvas' | 'Dashboard';
  quickButtonCount: number;
  showAddFromLibraryButton: boolean;
}> = ({ quickButtonCount, solution, showAddFromLibraryButton }) => {
  const primaryActionButton = primaryButtonConfigs[solution];
  const extraButtons = extraButtonConfigs[solution];
  let quickButtonGroup;
  let addFromLibraryButton;

  if (quickButtonCount > 0) {
    quickButtonGroup = <QuickButtonGroup buttons={quickButtons.slice(0, quickButtonCount)} />;
  }

  if (showAddFromLibraryButton) {
    addFromLibraryButton = <AddFromLibraryButton onClick={action('addFromLibrary')} />;
  }

  return (
    <SolutionToolbar>
      {{
        primaryActionButton,
        quickButtonGroup,
        extraButtons,
        addFromLibraryButton,
      }}
    </SolutionToolbar>
  );
};

export const Generic = Template.bind({});
Generic.args = {
  ...Template.args,
  solution: 'Generic',
};

export const Canvas = Template.bind({});
Canvas.args = {
  ...Template.args,
  solution: 'Canvas',
};

export const Dashboard = Template.bind({});
Dashboard.args = {
  ...Template.args,
  solution: 'Dashboard',
};
