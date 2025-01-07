/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { action } from '@storybook/addon-actions';
import React from 'react';
import { IconButtonGroup as Component } from './icon_button_group';
import mdx from '../../../README.mdx';

export default {
  title: 'Button Toolbar/Buttons',
  description: 'A collection of icon buttons that is a part of a toolbar.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

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

const argTypes = {
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

type Params = Record<keyof typeof argTypes, any>;

export const IconButtonGroup = ({ buttonCount }: Params) => {
  return <Component legend="Example icon group" buttons={iconButtons.slice(0, buttonCount)} />;
};

IconButtonGroup.argTypes = argTypes;
