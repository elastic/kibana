/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { action } from '@storybook/addon-actions';
import { Story } from '@storybook/react';
import React from 'react';
import { IconButtonGroup } from './icon_button_group';
import mdx from './icon_button_group.mdx';

export default {
  title: 'Toolbar/Buttons/Icon Button Group',
  description: 'A collection of buttons that is a part of a toolbar.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const quickButtons = [
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

export const ConnectedComponent: Story<{ buttonCount: number }> = ({ buttonCount }) => {
  return (
    <IconButtonGroup legend="Example icon group" buttons={quickButtons.slice(0, buttonCount)} />
  );
};

ConnectedComponent.argTypes = {
  buttonCount: {
    defaultValue: 2,
    control: {
      type: 'number',
      min: 1,
      max: 5,
      step: 1,
    },
  },
};
