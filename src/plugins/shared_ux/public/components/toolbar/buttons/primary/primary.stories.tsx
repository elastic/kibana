/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Story } from '@storybook/react';
import React from 'react';
import { ToolbarButton } from './primary';
import mdx from './primary.mdx';

export default {
  title: 'Toolbar/Primary button',
  description: 'A primary button that is a part of a toolbar.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
  argTypes: {
    iconType: {
      control: {
        type: 'radio',
        expanded: true,
        options: ['apps', 'logoGithub', 'folderCheck', 'documents'],
      },
    },
  },
};

export const Component: Story<{
  iconType: any;
}> = ({ iconType }) => {
  return <ToolbarButton label={'Primary Action'} iconType={iconType} />;
};

Component.args = {
  iconType: 'apps',
};
