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
import type { WorkflowDetailDto } from '@kbn/workflows';
import { WorkflowDetailPageLayout } from './workflow_detail_page_layout';
import { kibanaReactDecorator } from '../../../../.storybook/decorators';

const meta: Meta = {
  component: WorkflowDetailPageLayout,
  decorators: [
    (Story) => (
      <>
        <style>{`html, body { width: 100%; height: 100%; } 
        #storybook-root {
          min-height: 100%;
          display: flex;
          flex-direction: column;
        }
        .kbnAppWrapper {
          display: flex;
          flex-flow: column;
          flex-grow: 1;
          z-index: 0;
          position: relative;
        }
        `}</style>
        <div className="kbnAppWrapper">
          <div className="kbnAppWrapper">
            <Story />
          </div>
        </div>
      </>
    ),
    kibanaReactDecorator,
  ],
};

export default meta;

type Story = StoryObj<typeof WorkflowDetailPageLayout>;

const mockWorkflow: WorkflowDetailDto = {
  id: 'workflow-id',
  name: 'Example Workflow',
  enabled: false,
  createdAt: new Date(2025, 8, 25, 12, 0),
  lastUpdatedAt: new Date(2025, 8, 25, 12, 0),
  definition: {},
  yaml: '',
};

export const Default: Story = {
  args: {
    workflow: mockWorkflow,
    isLoading: false,
    isVisualEditorEnabled: true,
    selectedExecutionId: false,
  },
};
