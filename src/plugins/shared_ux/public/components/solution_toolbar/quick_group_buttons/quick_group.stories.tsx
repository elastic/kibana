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
import { QuickButtonGroup } from './quick_group';
import mdx from './quick_group.mdx';

export default {
  title: 'Solution Toolbar Quick Button Group',
  description: 'A collection of buttons that is a part of the solution toolbar.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
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
  },
};

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

export const Component: Story<{ quickButtonCount: number }> = ({ quickButtonCount }) => {
  return <QuickButtonGroup buttons={quickButtons.slice(0, quickButtonCount)} />;
};
