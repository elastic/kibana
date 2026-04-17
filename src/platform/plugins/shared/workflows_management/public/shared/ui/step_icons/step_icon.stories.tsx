/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import { HardcodedIcons } from './hardcoded_icons';
import { StepIcon } from './step_icon';
import { kibanaReactDecorator } from '../../../../.storybook/decorators';

export default {
  title: 'StepIcon',
  decorators: [kibanaReactDecorator],
};

const builtInTypes = [
  'manual',
  'alert',
  'scheduled',
  'http',
  'console',
  'wait',
  'if',
  'foreach',
  'slack',
  'inference',
  'elasticsearch',
  'kibana',
  'email',
];

const connectorTypes = [
  'gemini',
  'bedrock',
  'gen-ai',
  'jira',
  'opsgenie',
  'jira-service-management',
  'tines',
  'xmatters',
  'swimlane',
  'servicenow',
  'servicenow-sir',
  'servicenow-itom',
];

const hasHardcodedIcon = (type: string): boolean =>
  type in HardcodedIcons ||
  `.${type}` in HardcodedIcons ||
  type === 'elasticsearch' ||
  type === 'kibana';

const IconGrid = ({ types }: { types: string[] }) => (
  <EuiFlexGrid columns={4} gutterSize="l">
    {types.map((type) => (
      <EuiFlexItem key={type} grow={false}>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <StepIcon stepType={type} executionStatus={undefined} />
          </EuiFlexItem>
          <EuiFlexItem>
            <pre>{type}</pre>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    ))}
  </EuiFlexGrid>
);

export const Default = () => {
  const hardcoded = builtInTypes.filter(hasHardcodedIcon);
  const fallback = [...builtInTypes.filter((t) => !hasHardcodedIcon(t)), ...connectorTypes];

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem style={{ marginBottom: 8 }}>
        <EuiTitle size="xxs">
          <h3>{'Hardcoded icons (bundled SVGs)'}</h3>
        </EuiTitle>
      </EuiFlexItem>

      <IconGrid types={hardcoded} />
      <EuiFlexItem style={{ marginTop: 16, marginBottom: 8 }}>
        <EuiTitle size="xxs">
          <h3>{'Connector icons (lazy-loaded from stack_connectors in full Kibana)'}</h3>
        </EuiTitle>
        <EuiText size="xs" color="subdued">
          {
            'These show fallback icons in Storybook because the real logos are registered by stack_connectors at runtime.'
          }
        </EuiText>
      </EuiFlexItem>
      <IconGrid types={fallback} />
    </EuiFlexGroup>
  );
};
