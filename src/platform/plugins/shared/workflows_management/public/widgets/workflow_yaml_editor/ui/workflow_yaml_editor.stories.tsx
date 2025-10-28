/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Decorator, StoryObj } from '@storybook/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowYAMLEditor } from './workflow_yaml_editor';
import { kibanaReactDecorator } from '../../../../.storybook/decorators';
import { WorkflowDetailStoreProvider } from '../lib/store';

const StoryProviders: Decorator = (story: Function) => {
  return (
    <MemoryRouter>
      <WorkflowDetailStoreProvider>
        <div css={{ height: '600px', display: 'flex', flexDirection: 'column' }}>{story()}</div>
      </WorkflowDetailStoreProvider>
    </MemoryRouter>
  );
};

export default {
  title: 'Workflows Management/Workflow YAML Editor',
  component: WorkflowYAMLEditor,
  decorators: [kibanaReactDecorator, StoryProviders],
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
    workflowYaml,
    readOnly: false,
  },
};

export const ReadOnly: Story = {
  args: {
    workflowYaml,
    readOnly: true,
  },
};

export const WithStepExecutions: Story = {
  args: {
    workflowYaml,
    readOnly: false,
    stepExecutions: [
      {
        stepId: 'analysis',
        status: ExecutionStatus.COMPLETED,
        id: '1',
        workflowRunId: '1',
        workflowId: '1',
        startedAt: new Date().toISOString(),
        topologicalIndex: 0,
        globalExecutionIndex: 0,
        stepExecutionIndex: 0,
        scopeStack: [],
      },
      {
        stepId: 'debug_ai_response',
        status: ExecutionStatus.FAILED,
        id: '1',
        workflowRunId: '1',
        workflowId: '1',
        startedAt: new Date().toISOString(),
        topologicalIndex: 0,
        globalExecutionIndex: 0,
        stepExecutionIndex: 0,
        scopeStack: [],
      },
      {
        stepId: 'print-enter-dash',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        id: '1',
        workflowRunId: '1',
        workflowId: '1',
        startedAt: new Date().toISOString(),
        topologicalIndex: 0,
        globalExecutionIndex: 0,
        stepExecutionIndex: 0,
        scopeStack: [],
      },
      {
        stepId: 'foreachstep',
        status: ExecutionStatus.RUNNING,
        id: '1',
        workflowRunId: '1',
        workflowId: '1',
        startedAt: new Date().toISOString(),
        topologicalIndex: 0,
        globalExecutionIndex: 0,
        stepExecutionIndex: 0,
        scopeStack: [],
      },
      {
        stepId: 'log-name-surname',
        status: ExecutionStatus.COMPLETED,
        id: '1',
        workflowRunId: '1',
        workflowId: '1',
        startedAt: new Date().toISOString(),
        topologicalIndex: 0,
        globalExecutionIndex: 0,
        stepExecutionIndex: 0,
        scopeStack: [],
      },
      {
        stepId: 'slack_it',
        status: ExecutionStatus.COMPLETED,
        id: '1',
        workflowRunId: '1',
        workflowId: '1',
        startedAt: new Date().toISOString(),
        topologicalIndex: 0,
        globalExecutionIndex: 0,
        stepExecutionIndex: 0,
        scopeStack: [],
      },
      {
        stepId: 'print-exit-dash',
        status: ExecutionStatus.SKIPPED,
        id: '1',
        workflowRunId: '1',
        workflowId: '1',
        startedAt: new Date().toISOString(),
        topologicalIndex: 0,
        globalExecutionIndex: 0,
        stepExecutionIndex: 0,
        scopeStack: [],
      },
    ],
  },
};
