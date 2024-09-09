/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiContextMenu } from '@elastic/eui';

import { ToolbarPopover as Component } from './popover';
import mdx from '../../README.mdx';

const argTypes = {
  showIcon: {
    defaultValue: true,
    control: {
      type: 'boolean',
    },
  },
  buttonType: {
    defaultValue: 'empty',
    control: {
      type: 'radio',
      options: ['empty', 'primary'],
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

export const Popover = ({ showIcon, buttonType }: Params) => {
  return (
    <Component
      type={buttonType}
      label="Add element"
      iconType={showIcon ? 'plusInCircle' : undefined}
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

Popover.argTypes = argTypes;
