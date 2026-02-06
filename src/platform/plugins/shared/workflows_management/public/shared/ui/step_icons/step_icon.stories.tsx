/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { StepIcon } from './step_icon';

export default {
  title: 'StepIcon',
};

const types = [
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

export const Default = () => {
  return (
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
};
