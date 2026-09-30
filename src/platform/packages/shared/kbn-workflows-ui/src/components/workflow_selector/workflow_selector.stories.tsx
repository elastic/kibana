/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiPanel } from '@elastic/eui';
import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { WorkflowListDto, WorkflowListItemDto, WorkflowYaml } from '@kbn/workflows';
import { WorkflowSelectorWithProvider } from './workflow_selector_with_provider';
import type { WorkflowSelectorConfig } from './workflow_utils';

interface StoryArgs {
  selectedWorkflowId?: string;
  config?: WorkflowSelectorConfig;
  error?: string;
}

const buildWorkflow = (
  id: string,
  {
    name,
    description = `Description for ${name}`,
    enabled = true,
    tags,
  }: { name: string; description?: string; enabled?: boolean; tags?: string[] }
): WorkflowListItemDto => ({
  id,
  name,
  description,
  enabled,
  definition: {
    version: '1',
    name,
    enabled,
    triggers: [{ type: 'manual' }],
    steps: [],
    tags,
  } as unknown as WorkflowYaml,
  createdAt: '2026-01-01T00:00:00Z',
  history: [],
  valid: true,
  tags,
});

const sampleWorkflows: WorkflowListItemDto[] = [
  buildWorkflow('wf-1', {
    name: 'Sync Salesforce contacts',
    description: 'Pull new contacts every hour',
    tags: ['crm', 'sync'],
  }),
  buildWorkflow('wf-2', {
    name: 'Notify on-call on PagerDuty',
    description: 'Forward critical alerts to PagerDuty',
    tags: ['alerting'],
  }),
  buildWorkflow('wf-3', {
    name: 'Archive old indices',
    description: 'Disabled while we migrate to ILM',
    enabled: false,
  }),
  buildWorkflow('wf-4', {
    name: 'Backfill user profiles',
  }),
];

const buildResponse = (results: WorkflowListItemDto[]): WorkflowListDto => ({
  page: 1,
  size: results.length,
  total: results.length,
  results,
});

const renderWithServices = (args: StoryArgs, getWorkflows: () => Promise<WorkflowListDto>) => {
  const services = {
    application: {
      getUrlForApp: (appId: string) => `/app/${appId}`,
    },
    http: {
      get: (path: string) => {
        if (path === '/api/workflows') {
          return getWorkflows();
        }
        return Promise.resolve(undefined);
      },
    },
  };

  const Wrapper = () => {
    const [selectedWorkflowId, setSelectedWorkflowId] = useState(args.selectedWorkflowId);
    return (
      <EuiPanel style={{ maxWidth: 480 }}>
        <WorkflowSelectorWithProvider
          selectedWorkflowId={selectedWorkflowId}
          onWorkflowChange={setSelectedWorkflowId}
          config={args.config}
          error={args.error}
        />
      </EuiPanel>
    );
  };

  return (
    <KibanaContextProvider services={services}>
      <Wrapper />
    </KibanaContextProvider>
  );
};

const meta: Meta<StoryArgs> = {
  title: 'Workflows/WorkflowSelector',
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  render: (args) => renderWithServices(args, () => Promise.resolve(buildResponse(sampleWorkflows))),
};

export const WithSelectedWorkflow: Story = {
  args: {
    selectedWorkflowId: 'wf-2',
  },
  render: (args) => renderWithServices(args, () => Promise.resolve(buildResponse(sampleWorkflows))),
};

export const Loading: Story = {
  render: (args) => renderWithServices(args, () => new Promise(() => {})),
};

export const Empty: Story = {
  render: (args) => renderWithServices(args, () => Promise.resolve(buildResponse([]))),
};

export const ListView: Story = {
  args: {
    config: { listView: true, listViewMaxHeight: 320 },
  },
  render: (args) => renderWithServices(args, () => Promise.resolve(buildResponse(sampleWorkflows))),
};
