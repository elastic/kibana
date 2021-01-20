/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { action } from '@storybook/addon-actions';
import * as React from 'react';
import { PanelOptionsMenu } from '..';

export default {
  title: 'components/PanelOptionsMenu',
  component: PanelOptionsMenu,
  argTypes: {
    isViewMode: {
      control: { type: 'boolean' },
    },
  },
  decorators: [
    (Story: React.ComponentType) => (
      <div style={{ height: 150 }}>
        <Story />
      </div>
    ),
  ],
};

export function Default({ isViewMode }: React.ComponentProps<typeof PanelOptionsMenu>) {
  const euiContextDescriptors = {
    id: 'mainMenu',
    title: 'Options',
    items: [
      {
        name: 'Inspect',
        icon: 'inspect',
        onClick: action('onClick(inspect)'),
      },
      {
        name: 'Full screen',
        icon: 'expand',
        onClick: action('onClick(expand)'),
      },
    ],
  };

  return <PanelOptionsMenu panelDescriptor={euiContextDescriptors} isViewMode={isViewMode} />;
}
Default.args = { isViewMode: false } as React.ComponentProps<typeof PanelOptionsMenu>;
