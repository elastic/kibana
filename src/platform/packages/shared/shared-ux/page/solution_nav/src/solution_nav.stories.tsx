/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  useEuiMinBreakpoint,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { SolutionNavProps } from './solution_nav';
import { SolutionNav as Component } from './solution_nav';

export default {
  title: 'Page/Solution Nav',
  description: 'Solution-specific navigation for the sidebar',
};

type Params = Pick<SolutionNavProps, 'name' | 'icon'> & { showFooter?: boolean };

const FooterContent = () => {
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <strong>Solution Nav Footer</strong>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="s">
          This is a footer for the solution nav. You can use it to add additional content to the
          solution nav.
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton size="s" fullWidth onClick={action('click')}>
          Click me
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const items: SolutionNavProps['items'] = [
  {
    name: <div>Ingest</div>,
    id: '1',
    items: [
      {
        name: 'Ingest Node Pipelines',
        id: '1.1',
      },
      {
        name: 'Logstash Pipelines',
        id: '1.2',
      },
      {
        name: 'Beats Central Management',
        id: '1.3',
      },
    ],
  },
  {
    name: 'Data',
    id: '2',
    items: [
      {
        name: 'Index Management',
        id: '2.1',
      },
      {
        name: 'Index Lifecycle Policies',
        id: '2.2',
      },
      {
        name: 'Snapshot and Restore',
        id: '2.3',
      },
    ],
  },
  {
    name: 'Settings',
    id: '3',
    items: [
      {
        name: 'Cluster Settings',
        id: '3.1',
      },
      {
        name: 'Node Settings',
        id: '3.2',
      },
      {
        name: 'Index Settings',
        id: '3.3',
      },
      {
        name: 'Index Templates',
        id: '3.4',
      },
      {
        name: 'Node Templates',
        id: '3.5',
      },
      {
        name: 'Component Templates',
        id: '3.6',
      },
    ],
  },
];

export const SolutionNav = {
  args: {
    showFooter: true,
  },
  decorators: [
    (storyFn: Function) => {
      return (
        <div
          css={css`
            height: 100vh;
            ${useEuiMinBreakpoint('m')} {
              display: flex;
            }
          `}
        >
          {storyFn()}
        </div>
      );
    },
  ],
  render: (params: Params) => {
    const { showFooter, ...rest } = params;
    return (
      <Component
        items={items}
        isOpenOnDesktop={true}
        {...rest}
        onCollapse={action('onCollapse')}
        footer={showFooter ? <FooterContent /> : undefined}
      />
    );
  },

  argTypes: {
    name: {
      control: 'text',
      defaultValue: 'Kibana',
    },
    icon: {
      control: { type: 'radio' },
      options: ['logoKibana', 'logoObservability', 'logoSecurity'],
      defaultValue: 'logoKibana',
    },
    children: {
      control: 'text',
      defaultValue: '',
    },
    canBeCollapsed: {
      control: 'boolean',
      defaultValue: true,
    },
    showFooter: {
      control: 'boolean',
      defaultValue: true,
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
};
