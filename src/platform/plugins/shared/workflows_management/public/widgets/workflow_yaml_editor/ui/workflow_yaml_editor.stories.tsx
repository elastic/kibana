/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StoryObj } from '@storybook/react';
import React, { type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ExecutionStatus } from '@kbn/workflows';
import { kibanaReactDecorator } from '../../../../.storybook/decorators';
import { WorkflowYAMLEditor } from './workflow_yaml_editor';

export default {
  title: 'Workflows Management/Workflow YAML Editor',
  component: WorkflowYAMLEditor,
  decorators: [
    kibanaReactDecorator,
    (story: () => ReactNode) => (
      <MemoryRouter>
        <div css={{ height: '600px', display: 'flex', flexDirection: 'column' }}>{story()}</div>
      </MemoryRouter>
    ),
  ],
};

const workflowYaml = `name: Print famous people
enabled: true
triggers:
  - type: manual
steps:
  - name: analysis
    type: inference.completion
    connector-id: brain2
    with:
      input: |
        - Output JSON array with multiple object
        - Each item in the array must follow { "name": "Luisa", "surname": "Sampton" } structure
        - Generate random count of elements from 3 to 5
        - Generate some famous name and surname (Brad Pitt, etc)
        - Don't include anything else except JSON into the response
        - It MUST!!! be just raw JSON string, no formatting, no anything else

  - name: debug_ai_response
    type: console
    with:
      message: '{{ steps.analysis.output[0].result }}'

  - name: print-enter-dash
    type: slack
    connector-id: slacky
    with:
      message: '-------------------hellow-------'

  - name: foreachstep
    type: foreach
    foreach: steps.analysis.output.0.result
    steps:
      - name: log-name-surname
        type: console
        with:
          message: '{{ steps.foreachstep.item.name }} {{ steps.foreachstep.item.surname}}'

      - name: slack_it
        type: slack
        connector-id: slacky
        with:
          message: '{{ steps.foreachstep.item.name }} {{ steps.foreachstep.item.surname}}'

  - name: print-exit-dash
    type: slack
    connector-id: slacky
    with:
      message: '--------------------------'
`;

type Story = StoryObj<typeof WorkflowYAMLEditor>;

export const Default: Story = {
  args: {
    workflowId: '1',
    filename: 'workflow.yaml',
    readOnly: false,
    hasChanges: false,
    lastUpdatedAt: new Date(),
    highlightStep: undefined,
    stepExecutions: [],
    onMount: () => {},
    onChange: () => {},
    onSave: () => {},
    onValidationErrors: () => {},
    value: workflowYaml,
  },
};

export const WithHighlightStep: Story = {
  args: {
    workflowId: '1',
    filename: 'workflow.yaml',
    readOnly: false,
    hasChanges: false,
    lastUpdatedAt: new Date(),
    highlightStep: 'analysis',
    value: workflowYaml,
  },
};

export const WithStepExecutions: Story = {
  args: {
    workflowId: '1',
    filename: 'workflow.yaml',
    readOnly: false,
    hasChanges: false,
    lastUpdatedAt: new Date(),
    highlightStep: undefined,
    value: workflowYaml,
    stepExecutions: [
      {
        stepId: 'analysis',
        status: ExecutionStatus.COMPLETED,
        spaceId: '1',
        id: '1',
        workflowRunId: '1',
        workflowId: '1',
        startedAt: new Date().toISOString(),
        topologicalIndex: 0,
        executionIndex: 0,
      },
      {
        stepId: 'debug_ai_response',
        status: ExecutionStatus.FAILED,
        spaceId: '1',
        id: '1',
        workflowRunId: '1',
        workflowId: '1',
        startedAt: new Date().toISOString(),
        topologicalIndex: 0,
        executionIndex: 0,
      },
      {
        stepId: 'print-enter-dash',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        spaceId: '1',
        id: '1',
        workflowRunId: '1',
        workflowId: '1',
        startedAt: new Date().toISOString(),
        topologicalIndex: 0,
        executionIndex: 0,
      },
      {
        stepId: 'foreachstep',
        status: ExecutionStatus.RUNNING,
        spaceId: '1',
        id: '1',
        workflowRunId: '1',
        workflowId: '1',
        startedAt: new Date().toISOString(),
        topologicalIndex: 0,
        executionIndex: 0,
      },
      {
        stepId: 'log-name-surname',
        status: ExecutionStatus.COMPLETED,
        spaceId: '1',
        id: '1',
        workflowRunId: '1',
        workflowId: '1',
        startedAt: new Date().toISOString(),
        topologicalIndex: 0,
        executionIndex: 0,
      },
      {
        stepId: 'slack_it',
        status: ExecutionStatus.COMPLETED,
        spaceId: '1',
        id: '1',
        workflowRunId: '1',
        workflowId: '1',
        startedAt: new Date().toISOString(),
        topologicalIndex: 0,
        executionIndex: 0,
      },
      {
        stepId: 'print-exit-dash',
        status: ExecutionStatus.SKIPPED,
        spaceId: '1',
        id: '1',
        workflowRunId: '1',
        workflowId: '1',
        startedAt: new Date().toISOString(),
        topologicalIndex: 0,
        executionIndex: 0,
      },
    ],
  },
};
