/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { Story } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiContextMenu } from '@elastic/eui';

import { Toolbar } from './toolbar';
import { AddFromLibraryButton, IconButtonGroup, ToolbarButton } from '../buttons';
import { ToolbarPopover } from '../popover';

const iconButtons = [
  {
    label: 'Text',
    onClick: action('onTextClick'),
    iconType: 'visText',
    title: 'Text as markdown',
  },
  {
    label: 'Control',
    onClick: action('onControlClick'),
    iconType: 'controlsHorizontal',
  },
  {
    label: 'Link',
    onClick: action('onLinkClick'),
    iconType: 'link',
  },
  {
    label: 'Image',
    onClick: action('onImageClick'),
    iconType: 'image',
  },
  {
    label: 'Markup',
    onClick: action('onMarkupClick'),
    iconType: 'visVega',
  },
];

const primaryButtonConfigs = {
  Generic: (
    <ToolbarButton
      type="primary"
      label="Primary Action"
      iconType="apps"
      onClick={action('generic')}
    />
  ),
  Canvas: (
    <ToolbarPopover
      type="primary"
      label="Add element"
      iconType="plusInCircle"
      panelPaddingSize="none"
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
                  onClick: action('Lens'),
                },
                {
                  name: 'Maps',
                  icon: 'logoMaps',
                  onClick: action('Maps'),
                },
                {
                  name: 'TSVB',
                  icon: 'visVisualBuilder',
                  onClick: action('TSVB'),
                },
              ],
            },
          ]}
        />
      )}
    </ToolbarPopover>
  ),
  Dashboard: (
    <ToolbarButton
      type="primary"
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
    <ToolbarPopover iconType="visualizeApp" label="All editors" panelPaddingSize="none">
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
                  onClick: action('Lens'),
                },
                {
                  name: 'Maps',
                  icon: 'logoMaps',
                  onClick: action('Maps'),
                },
                {
                  name: 'TSVB',
                  icon: 'visVisualBuilder',
                  onClick: action('TSVB'),
                },
              ],
            },
          ]}
        />
      )}
    </ToolbarPopover>,
  ],
};

export default {
  title: 'Toolbar',
  description: 'A universal toolbar for solutions.',
  component: Toolbar,
  argTypes: {
    iconButtonCount: {
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
  iconButtonCount: number;
  showAddFromLibraryButton: boolean;
}> = ({ iconButtonCount, solution, showAddFromLibraryButton }) => {
  const primaryButton = primaryButtonConfigs[solution];
  const extraButtons = showAddFromLibraryButton
    ? [
        ...(extraButtonConfigs[solution] ?? []),
        <AddFromLibraryButton onClick={action('addFromLibrary')} />,
      ]
    : extraButtonConfigs[solution];
  let iconButtonGroup;

  if (iconButtonCount > 0) {
    iconButtonGroup = (
      <IconButtonGroup buttons={iconButtons.slice(0, iconButtonCount)} legend="example" />
    );
  }

  return (
    <Toolbar>
      {{
        primaryButton,
        iconButtonGroup,
        extraButtons,
      }}
    </Toolbar>
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
