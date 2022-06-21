/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiContextMenu } from '@elastic/eui';

import { ToolbarPopover as Component } from './popover';
import mdx from '../../README.mdx';

const argTypes = {
  iconSide: {
    control: {
      type: 'radio',
      options: ['left', 'right', 'undefined'],
    },
  },
};

type Params = Record<keyof typeof argTypes, any>;

export default {
  title: 'Button Toolbar',
  description: 'A popover that is a part of a toolbar.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
  argTypes,
};

export const Popover = ({ iconSide }: Params) => {
  return (
    <Component
      label="Add element"
      iconType={iconSide === 'right' ? 'arrowDown' : 'plusInCircle'}
      iconSide={iconSide}
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
    </Component>
  );
};

Popover.args = {
  iconSide: 'left',
};
