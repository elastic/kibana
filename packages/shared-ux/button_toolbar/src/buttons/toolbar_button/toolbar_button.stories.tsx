/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ToolbarButton as Component } from './toolbar_button';
import mdx from '../../../README.mdx';

export default {
  title: 'Button Toolbar/Buttons',
  description: 'A button that is a part of a toolbar.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const argTypes = {
  buttonType: {
    defaultValue: 'empty',
    control: {
      type: 'radio',
      options: ['empty', 'primary'],
    },
  },
  iconSide: {
    defaultValue: 'left',
    control: {
      type: 'radio',
      options: ['left', 'right', 'undefined'],
    },
  },
};

type Params = Record<keyof typeof argTypes, any>;

export const ToolbarButton = ({ buttonType, iconSide }: Params) => {
  return (
    <Component label="Toolbar button" iconType="lensApp" type={buttonType} iconSide={iconSide} />
  );
};

ToolbarButton.argTypes = argTypes;
