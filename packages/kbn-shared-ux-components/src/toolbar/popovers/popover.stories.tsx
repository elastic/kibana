/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiContextMenu } from '@elastic/eui';
import { ButtonContentIconSide } from '@elastic/eui/src/components/button/button_content';
import { Story } from '@storybook/react';
import React from 'react';
import { ToolbarPopover } from './popover';
import mdx from './popover.mdx';

export default {
  title: 'Toolbar/Popover',
  description: 'A popover that is a part of a toolbar.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
  argTypes: {
    iconSide: {
      control: {
        type: 'radio',
        options: ['left', 'right', 'undefined'],
      },
    },
  },
};

export const Component: Story<{
  iconSide: ButtonContentIconSide | undefined;
}> = ({ iconSide }) => {
  return (
    <ToolbarPopover label="Add element" iconType="plusInCircle" iconSide={iconSide}>
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
    </ToolbarPopover>
  );
};

Component.args = {
  iconSide: 'left',
};
