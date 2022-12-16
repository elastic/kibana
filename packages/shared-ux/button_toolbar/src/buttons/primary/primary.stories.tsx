/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { PrimaryButton as Component } from './primary';
import mdx from '../../../README.mdx';

const argTypes = {
  iconType: {
    control: {
      type: 'radio',
      expanded: true,
      options: ['apps', 'logoGithub', 'folderCheck', 'documents'],
    },
  },
};

type Params = Record<keyof typeof argTypes, any>;

export default {
  title: 'Button Toolbar/Buttons',
  description: 'A primary button that is a part of a toolbar.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
  argTypes,
};

export const PrimaryButton = ({ iconType }: Params) => {
  return <Component label={'Primary Action'} iconType={iconType} />;
};

PrimaryButton.args = {
  iconType: 'apps',
};
