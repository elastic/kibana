/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
} from '@elastic/eui';
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { AccessDenied } from './access_denied';
import { kibanaReactDecorator } from '../../../.storybook/decorators';

const meta: Meta<typeof AccessDenied> = {
  title: 'AccessDenied',
  component: AccessDenied,
  decorators: [kibanaReactDecorator],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AccessDenied>;

/**
 * Rendered when the user lacks the required Kibana privileges to access workflows in the current space.
 * Mirrors the `PrivilegesAccessDenied` component from `workflows_privileges_wrapper.tsx`.
 */
export const Privileges: Story = {
  args: {
    title: 'Contact your administrator for access',
    description: 'To view workflows in this space, you need additional privileges.',
    footer: (
      <EuiFlexGroup
        gutterSize="s"
        wrap
        direction="column"
        justifyContent="center"
        responsive={false}
        alignItems="center"
      >
        <EuiFlexItem>
          <EuiText color="subdued" textAlign="center" size="xs">
            <p style={{ marginBlock: 0 }}>{'Minimum privileges required:'}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{'Workflows: Read'}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
};

/**
 * Rendered when the deployment does not have the required license (stateful) or
 * the serverless project tier is insufficient.
 * Mirrors the `LicenseAccessDenied` component from `workflows_availability_wrapper.tsx`.
 */
export const Availability: Story = {
  args: {
    title: 'Upgrade your license',
    description: 'You need to upgrade your license to use Workflows.',
    actions: [
      <EuiButton fill href="https://www.elastic.co/subscriptions" target="_blank">
        {'Subscription plans'}
        <EuiIcon type="popout" aria-hidden={true} />
      </EuiButton>,
      <EuiButtonEmpty href="#">{'Manage your license'}</EuiButtonEmpty>,
    ],
    footer: (
      <EuiFlexGroup
        gutterSize="s"
        wrap
        direction="column"
        justifyContent="center"
        responsive={false}
        alignItems="center"
      >
        <EuiFlexItem>
          <EuiText color="subdued" textAlign="center" size="xs">
            <p style={{ marginBlock: 0 }}>{'License required:'}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{'Enterprise'}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
};
