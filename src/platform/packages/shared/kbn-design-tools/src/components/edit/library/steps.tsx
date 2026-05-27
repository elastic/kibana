/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiSteps, EuiStepsHorizontal, EuiText } from '@elastic/eui';

const verticalSteps = [
  {
    title: 'Install the agent',
    children: (
      <EuiText size="s">
        <p>Download and install the Elastic Agent on your host.</p>
      </EuiText>
    ),
  },
  {
    title: 'Configure the agent',
    children: (
      <EuiText size="s">
        <p>Edit the configuration file with your deployment details.</p>
      </EuiText>
    ),
  },
  {
    title: 'Verify connection',
    children: (
      <EuiText size="s">
        <p>Check that data is flowing into your cluster.</p>
      </EuiText>
    ),
  },
];

const statusSteps = [
  {
    title: 'Completed step',
    children: (
      <EuiText size="s">
        <p>This step is done.</p>
      </EuiText>
    ),
    status: 'complete' as const,
  },
  {
    title: 'Current step',
    children: (
      <EuiText size="s">
        <p>You are here.</p>
      </EuiText>
    ),
    status: 'current' as const,
  },
  {
    title: 'Incomplete step',
    children: (
      <EuiText size="s">
        <p>Not yet started.</p>
      </EuiText>
    ),
    status: 'incomplete' as const,
  },
];

const horizontalSteps = [
  { title: 'Completed', status: 'complete' as const, onClick: () => {} },
  { title: 'Current', status: 'current' as const, onClick: () => {} },
  { title: 'Incomplete', onClick: () => {} },
  { title: 'Disabled', disabled: true, onClick: () => {} },
];

export const StepsRegular = () => <EuiSteps steps={verticalSteps} />;

export const StepsWithStatus = () => <EuiSteps steps={statusSteps} />;

export const StepsHorizontal = () => <EuiStepsHorizontal steps={horizontalSteps} />;

export const StepsSmall = () => <EuiSteps steps={verticalSteps} titleSize="xs" />;
