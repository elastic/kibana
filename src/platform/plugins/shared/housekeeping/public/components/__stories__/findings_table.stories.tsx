/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AskAgentContext } from '../../metadata';
import { FindingsTable } from '../findings_table';
import {
  missingPipelines,
  missingPolicies,
  noRetention,
  unusedPipelines,
  unusedPolicies,
} from './fixtures';
import { withResourceTypes } from './decorators';

const meta: Meta<typeof FindingsTable> = {
  title: 'Housekeeping/Findings table',
  component: FindingsTable,
  decorators: [withResourceTypes],
};
export default meta;

type Story = StoryObj<typeof FindingsTable>;

export const BrokenReferences: Story = { args: { groups: [missingPipelines, missingPolicies] } };
export const Unused: Story = { args: { groups: [unusedPipelines, unusedPolicies] } };
export const RiskWithFix: Story = { args: { groups: [noRetention] } };

export const WithoutAgentBuilder: Story = {
  args: { groups: [missingPipelines] },
  decorators: [
    (StoryComponent) => (
      <AskAgentContext.Provider value={undefined}>
        <StoryComponent />
      </AskAgentContext.Provider>
    ),
  ],
};

export const ManyRows: Story = {
  args: {
    groups: [
      {
        ...unusedPipelines,
        findings: Array.from({ length: 45 }, (_, index) => ({
          id: `unused|ingest_pipeline:old-${index}`,
          resource: { type: 'ingest_pipeline', id: `old-pipeline-${index}` },
          related: [],
        })),
      },
    ],
  },
};

export const NoMatches: Story = { args: { groups: [] } };
