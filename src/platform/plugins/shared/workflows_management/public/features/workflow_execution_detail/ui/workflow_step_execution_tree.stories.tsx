/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import type { WorkflowYaml } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowStepExecutionTree } from './workflow_step_execution_tree';
import { kibanaReactDecorator } from '../../../../.storybook/decorators';
import { parseYamlToJSONWithoutValidation } from '../../../../common/lib/yaml';

const meta: Meta<typeof WorkflowStepExecutionTree> = {
  component: WorkflowStepExecutionTree,
  title: 'Workflows Management/Step Execution Tree',
  decorators: [
    kibanaReactDecorator,
    (story) => (
      <>
        <style>{`
      body {
      min-height: 100%;
      display: flex !important;
      flex-direction: column;
    }
      #storybook-root {
        display: flex;
        flex-direction: column;
        flex: 1 1 0;
        overflow: hidden;
      }
    `}</style>
        {story()}
      </>
    ),
  ],
};

export default meta;

const yaml = `
name: Print famous people
enabled: true
triggers:
  - type: manual
steps:
  - name: analysis
    type: inference.completion
    connector-id: openai
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
          message: '{{ foreach.item.name }} {{ steps.foreachstep.item.surname}}'

      - name: slack_it
        type: slack
        connector-id: slacky
        with:
          message: '{{ foreach.item.name }} {{ steps.foreachstep.item.surname }}'

  - name: print-exit-dash
    type: slack
    connector-id: slacky
    with:
      message: '--------------------------'
`;
const result = parseYamlToJSONWithoutValidation(yaml);
// @ts-expect-error -- it's a storybook story, we don't need to type it
const definition = result.json as WorkflowYaml;

// export interface WorkflowExecutionDto {
//   spaceId: string;
//   id: string;
//   status: ExecutionStatus;
//   startedAt: string;
//   finishedAt: string;
//   workflowId?: string;
//   workflowName?: string;
//   workflowDefinition: WorkflowYaml;
//   stepExecutions: WorkflowStepExecutionDto[];
//   stepExecutionsTree: StepExecutionTreeItem[];
//   duration: number | null;
//   triggeredBy?: string; // 'manual' or 'scheduled'
//   yaml: string;
// }

export const Default: StoryObj<typeof WorkflowStepExecutionTree> = {
  args: {
    execution: {
      id: 'db38b255-ec34-4048-8b77-776081cb3a97',
      spaceId: 'default',
      workflowId: '61025f92-5e23-4327-9e39-b1fb8585b710',
      workflowDefinition: definition,
      yaml,
      status: ExecutionStatus.COMPLETED,
      error: null,
      isTestRun: false,
      triggeredBy: 'manual',
      startedAt: '2025-09-02T20:43:57.441Z',
      finishedAt: '2025-09-02T20:44:15.945Z',
      duration: 18504,
      stepExecutions: [
        {
          stepId: 'analysis',
          stepType: 'inference.completion',
          topologicalIndex: 0,
          status: ExecutionStatus.PENDING,
          startedAt: '2025-09-02T20:43:57.466Z',
          id: '61d229be-d8d8-4af5-adeb-5454564bf000',
          globalExecutionIndex: 0,
          stepExecutionIndex: 0,
          workflowRunId: 'db38b255-ec34-4048-8b77-776081cb3a97',
          workflowId: '61025f92-5e23-4327-9e39-b1fb8585b710',
          output: {
            result:
              '[{"name":"Brad","surname":"Pitt"},{"name":"Angelina","surname":"Jolie"},{"name":"Leonardo","surname":"DiCaprio"},{"name":"Scarlett","surname":"Johansson"}]',
          },
          input: {
            input:
              '- Output JSON array with multiple object\n- Each item in the array must follow { "name": "Luisa", "surname": "Sampton" } structure\n- Generate random count of elements from 3 to 5\n- Generate some famous name and surname (Brad Pitt, etc)\n- Don\'t include anything else except JSON into the response\n- It MUST!!! be just raw JSON string, no formatting, no anything else\n',
          },
          finishedAt: '2025-09-02T20:44:01.245Z',
          executionTimeMs: 3779,
          scopeStack: [],
        },
        {
          stepId: 'debug_ai_response',
          stepType: 'console',
          topologicalIndex: 1,
          status: ExecutionStatus.RUNNING,
          startedAt: '2025-09-02T20:44:02.142Z',
          id: '6b035884-16ec-4df7-ac72-8de259b2e8a4',
          globalExecutionIndex: 1,
          stepExecutionIndex: 0,
          workflowRunId: 'db38b255-ec34-4048-8b77-776081cb3a97',
          workflowId: '61025f92-5e23-4327-9e39-b1fb8585b710',
          output: {
            output:
              '[{&quot;name&quot;:&quot;Brad&quot;,&quot;surname&quot;:&quot;Pitt&quot;},{&quot;name&quot;:&quot;Angelina&quot;,&quot;surname&quot;:&quot;Jolie&quot;},{&quot;name&quot;:&quot;Leonardo&quot;,&quot;surname&quot;:&quot;DiCaprio&quot;},{&quot;name&quot;:&quot;Scarlett&quot;,&quot;surname&quot;:&quot;Johansson&quot;}]',
          },
          input: {
            message:
              '[{&quot;name&quot;:&quot;Brad&quot;,&quot;surname&quot;:&quot;Pitt&quot;},{&quot;name&quot;:&quot;Angelina&quot;,&quot;surname&quot;:&quot;Jolie&quot;},{&quot;name&quot;:&quot;Leonardo&quot;,&quot;surname&quot;:&quot;DiCaprio&quot;},{&quot;name&quot;:&quot;Scarlett&quot;,&quot;surname&quot;:&quot;Johansson&quot;}]',
          },
          finishedAt: '2025-09-02T20:44:02.167Z',
          executionTimeMs: 25,
          scopeStack: [],
        },
        {
          stepId: 'print-enter-dash',
          stepType: 'slack',
          topologicalIndex: 2,
          status: ExecutionStatus.COMPLETED,
          startedAt: '2025-09-02T20:44:03.171Z',
          id: '765f1b7a-34ed-4716-9418-175e2c8543f4',
          globalExecutionIndex: 2,
          stepExecutionIndex: 0,
          workflowRunId: 'db38b255-ec34-4048-8b77-776081cb3a97',
          workflowId: '61025f92-5e23-4327-9e39-b1fb8585b710',
          output: {
            text: 'ok',
          },
          input: {
            message: '-------------------hellow-------',
          },
          finishedAt: '2025-09-02T20:44:03.627Z',
          executionTimeMs: 456,
          scopeStack: [],
        },
        {
          stepId: 'foreachstep',
          stepType: 'foreach',
          topologicalIndex: 4,
          status: ExecutionStatus.SKIPPED,
          startedAt: '2025-09-02T20:44:05.233Z',
          id: '58ecc47e-3a98-4b6e-b018-2b44b6e366a6',
          globalExecutionIndex: 3,
          stepExecutionIndex: 0,
          workflowRunId: 'db38b255-ec34-4048-8b77-776081cb3a97',
          workflowId: '61025f92-5e23-4327-9e39-b1fb8585b710',
          state: {
            item: {
              surname: 'Johansson',
              name: 'Scarlett',
            },
            total: 4,
            index: 3,
            items: [
              {
                surname: 'Pitt',
                name: 'Brad',
              },
              {
                surname: 'Jolie',
                name: 'Angelina',
              },
              {
                surname: 'DiCaprio',
                name: 'Leonardo',
              },
              {
                surname: 'Johansson',
                name: 'Scarlett',
              },
            ],
          },
          finishedAt: '2025-09-02T20:44:14.522Z',
          executionTimeMs: 9289,
          scopeStack: [],
        },
        {
          stepId: 'log-name-surname',
          stepType: 'console',
          topologicalIndex: 5,
          status: ExecutionStatus.WAITING_FOR_INPUT,
          startedAt: '2025-09-02T20:44:12.598Z',
          id: 'f71b2778-a92d-4d4d-a5e7-8cbf5c0794e4',
          globalExecutionIndex: 4,
          stepExecutionIndex: 3,
          workflowRunId: 'db38b255-ec34-4048-8b77-776081cb3a97',
          workflowId: '61025f92-5e23-4327-9e39-b1fb8585b710',
          output: {
            message: 'Scarlett Johansson',
          },
          input: {
            message: 'Scarlett Johansson',
          },
          finishedAt: '2025-09-02T20:44:12.694Z',
          executionTimeMs: 96,
          scopeStack: [
            {
              stepId: 'foreachstep',
              nestedScopes: [{ nodeId: 'enterForeach', nodeType: 'foreach', scopeId: '0' }],
            },
          ],
        },
        {
          stepId: 'log-name-surname',
          stepType: 'console',
          topologicalIndex: 5,
          status: ExecutionStatus.WAITING,
          startedAt: '2025-09-02T20:44:10.456Z',
          id: 'aedd1aff-54d2-4238-ba05-6f72a82d6613',
          globalExecutionIndex: 5,
          stepExecutionIndex: 2,
          workflowRunId: 'db38b255-ec34-4048-8b77-776081cb3a97',
          workflowId: '61025f92-5e23-4327-9e39-b1fb8585b710',
          output: {
            message: 'Leonardo DiCaprio',
          },
          input: {
            message: 'Leonardo DiCaprio',
          },
          finishedAt: '2025-09-02T20:44:10.491Z',
          executionTimeMs: 35,
          scopeStack: [
            {
              stepId: 'foreachstep',
              nestedScopes: [{ nodeId: 'enterForeach', nodeType: 'foreach', scopeId: '1' }],
            },
          ],
        },
        {
          stepId: 'log-name-surname',
          stepType: 'console',
          topologicalIndex: 5,
          status: ExecutionStatus.COMPLETED,
          startedAt: '2025-09-02T20:44:08.396Z',
          id: 'e8739d72-5a1e-4a19-8382-a15ffaf12bb0',
          globalExecutionIndex: 6,
          stepExecutionIndex: 1,
          workflowRunId: 'db38b255-ec34-4048-8b77-776081cb3a97',
          workflowId: '61025f92-5e23-4327-9e39-b1fb8585b710',
          output: {
            message: 'Angelina Jolie',
          },
          input: {
            message: 'Angelina Jolie',
          },
          finishedAt: '2025-09-02T20:44:08.423Z',
          executionTimeMs: 27,
          scopeStack: [
            {
              stepId: 'foreachstep',
              nestedScopes: [{ nodeId: 'enterForeach', nodeType: 'foreach', scopeId: '3' }],
            },
          ],
        },
        {
          stepId: 'log-name-surname',
          stepType: 'console',
          topologicalIndex: 5,
          status: ExecutionStatus.FAILED,
          startedAt: '2025-09-02T20:44:06.265Z',
          id: '7e36c4c3-6d99-4d2f-a0b8-8229904ef0cf',
          globalExecutionIndex: 7,
          stepExecutionIndex: 0,
          workflowRunId: 'db38b255-ec34-4048-8b77-776081cb3a97',
          workflowId: '61025f92-5e23-4327-9e39-b1fb8585b710',
          output: {
            message: 'Brad Pitt',
          },
          input: {
            message: 'Brad Pitt',
          },
          finishedAt: '2025-09-02T20:44:06.293Z',
          executionTimeMs: 28,
          scopeStack: [
            {
              stepId: 'foreachstep',
              nestedScopes: [{ nodeId: 'enterForeach', nodeType: 'foreach', scopeId: '4' }],
            },
          ],
        },
        {
          stepId: 'slack_it',
          stepType: 'slack',
          topologicalIndex: 6,
          status: ExecutionStatus.COMPLETED,
          startedAt: '2025-09-02T20:44:13.480Z',
          id: 'a44f84d1-0b7f-4aed-8060-b7ef12aa267c',
          globalExecutionIndex: 8,
          stepExecutionIndex: 3,
          workflowRunId: 'db38b255-ec34-4048-8b77-776081cb3a97',
          workflowId: '61025f92-5e23-4327-9e39-b1fb8585b710',
          output: {
            text: 'ok',
          },
          input: {
            message: 'Scarlett Johansson',
          },
          finishedAt: '2025-09-02T20:44:13.895Z',
          executionTimeMs: 415,
          scopeStack: [
            {
              stepId: 'foreachstep',
              nestedScopes: [{ nodeId: 'enterForeach', nodeType: 'foreach', scopeId: '5' }],
            },
          ],
        },
        {
          stepId: 'slack_it',
          stepType: 'slack',
          topologicalIndex: 6,
          status: ExecutionStatus.COMPLETED,
          startedAt: '2025-09-02T20:44:11.422Z',
          id: 'fe7786c2-95f4-49d6-9935-b1a897ed9390',
          globalExecutionIndex: 9,
          stepExecutionIndex: 2,
          workflowRunId: 'db38b255-ec34-4048-8b77-776081cb3a97',
          workflowId: '61025f92-5e23-4327-9e39-b1fb8585b710',
          output: {
            text: 'ok',
          },
          input: {
            message: 'Leonardo DiCaprio',
          },
          finishedAt: '2025-09-02T20:44:11.823Z',
          executionTimeMs: 401,
          scopeStack: [
            {
              stepId: 'foreachstep',
              nestedScopes: [{ nodeId: 'enterForeach', nodeType: 'foreach', scopeId: '6' }],
            },
          ],
        },
        {
          stepId: 'slack_it',
          stepType: 'slack',
          topologicalIndex: 6,
          status: ExecutionStatus.COMPLETED,
          startedAt: '2025-09-02T20:44:09.363Z',
          id: '57b14a10-93c6-471a-b9d2-d027cf340d31',
          globalExecutionIndex: 10,
          stepExecutionIndex: 1,
          workflowRunId: 'db38b255-ec34-4048-8b77-776081cb3a97',
          workflowId: '61025f92-5e23-4327-9e39-b1fb8585b710',
          output: {
            text: 'ok',
          },
          input: {
            message: 'Angelina Jolie',
          },
          finishedAt: '2025-09-02T20:44:09.756Z',
          executionTimeMs: 393,
          scopeStack: [
            {
              stepId: 'foreachstep',
              nestedScopes: [{ nodeId: 'enterForeach', nodeType: 'foreach', scopeId: '7' }],
            },
          ],
        },
        {
          stepId: 'slack_it',
          stepType: 'slack',
          topologicalIndex: 6,
          status: ExecutionStatus.COMPLETED,
          startedAt: '2025-09-02T20:44:07.300Z',
          id: '4e76f94d-2092-41bb-9c07-171b9207de98',
          globalExecutionIndex: 11,
          stepExecutionIndex: 0,
          workflowRunId: 'db38b255-ec34-4048-8b77-776081cb3a97',
          workflowId: '61025f92-5e23-4327-9e39-b1fb8585b710',
          output: {
            text: 'ok',
          },
          input: {
            message: 'Brad Pitt',
          },
          finishedAt: '2025-09-02T20:44:07.692Z',
          executionTimeMs: 392,
          scopeStack: [
            {
              stepId: 'foreachstep',
              nestedScopes: [{ nodeId: 'enterForeach', nodeType: 'foreach', scopeId: '8' }],
            },
          ],
        },
        {
          stepId: 'print-exit-dash',
          stepType: 'slack',
          topologicalIndex: 8,
          status: ExecutionStatus.COMPLETED,
          startedAt: '2025-09-02T20:44:15.553Z',
          id: '16b8cb55-9946-4adb-b086-ebc37c60fa86',
          globalExecutionIndex: 12,
          stepExecutionIndex: 0,
          workflowRunId: 'db38b255-ec34-4048-8b77-776081cb3a97',
          workflowId: '61025f92-5e23-4327-9e39-b1fb8585b710',
          output: {
            text: 'ok',
          },
          input: {
            message: '--------------------------',
          },
          finishedAt: '2025-09-02T20:44:15.945Z',
          executionTimeMs: 392,
          scopeStack: [],
        },
      ],
    },
    definition,
    selectedId: '7c08bf0e-c78f-4b6e-8ef5-23863cb1923a',
    onStepExecutionClick: () => {},
  },
};

export const Empty = {
  args: {
    execution: {
      id: '1',
      status: ExecutionStatus.COMPLETED,
      startedAt: new Date(),
      finishedAt: new Date(),
      duration: 1000,
      stepExecutions: [],
    },
  },
};

export const Loading: StoryObj<typeof WorkflowStepExecutionTree> = {
  args: {
    error: null,
    selectedId: null,
  },
};

export const NoStepExecutionsExecuting: StoryObj<typeof WorkflowStepExecutionTree> = {
  args: {
    error: null,
    execution: {
      id: 'db38b255-ec34-4048-8b77-776081cb3a97',
      spaceId: 'default',
      workflowId: '61025f92-5e23-4327-9e39-b1fb8585b710',
      workflowDefinition: definition,
      yaml,
      status: ExecutionStatus.RUNNING,
      error: null,
      isTestRun: false,
      triggeredBy: 'manual',
      startedAt: '2025-09-02T20:43:57.441Z',
      finishedAt: '2025-09-02T20:44:15.945Z',
      duration: 18504,
      stepExecutions: [],
    },
    definition,
  },
};

export const NoStepExecutions: StoryObj<typeof WorkflowStepExecutionTree> = {
  args: {
    error: null,
    execution: {
      id: 'db38b255-ec34-4048-8b77-776081cb3a97',
      spaceId: 'default',
      workflowId: '61025f92-5e23-4327-9e39-b1fb8585b710',
      workflowDefinition: definition,
      yaml,
      status: ExecutionStatus.COMPLETED,
      error: null,
      isTestRun: false,
      triggeredBy: 'manual',
      startedAt: '2025-09-02T20:43:57.441Z',
      finishedAt: '2025-09-02T20:44:15.945Z',
      duration: 18504,
      stepExecutions: [],
    },
  },
};

export const ErrorStory: StoryObj<typeof WorkflowStepExecutionTree> = {
  args: {
    error: new Error('Internal server error'),
    selectedId: null,
  },
};
