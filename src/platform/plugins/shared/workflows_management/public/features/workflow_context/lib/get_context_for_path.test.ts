/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ConnectorContract, generateYamlSchemaFromConnectors } from '@kbn/workflows';
import { getWorkflowGraph } from '../../../entities/workflows/lib/get_workflow_graph';
import { getContextForPath } from './get_context_for_path';
import { z } from '@kbn/zod';

describe('getContextForPath', () => {
  const mockConnectors: ConnectorContract[] = [
    {
      type: 'console.log',
      params: [
        {
          name: 'message',
          type: 'string',
        },
      ],
    },
  ];
  const workflowSchema = generateYamlSchemaFromConnectors(mockConnectors);
  const definition: z.infer<typeof workflowSchema> = {
    version: '1',
    workflow: {
      name: 'test-workflow',
      enabled: true,
      triggers: [
        {
          id: 'manual-trigger',
          type: 'triggers.elastic.manual',
        },
      ],
      steps: [
        {
          name: 'first-step',
          type: 'console.log',
          with: {
            message: 'Hello, world!',
          },
        },
        {
          name: 'second-step',
          type: 'console.log',
          with: {
            message: 'Again, hello, world!',
          },
        },
        {
          name: 'if-split',
          type: 'if',
          condition: '1 > 0',
          steps: [
            {
              name: 'if-true-1',
              type: 'console.log',
              with: {
                message: 'If true',
              },
            },
            {
              name: 'if-true-2',
              type: 'console.log',
              with: {
                message: 'If true 2',
              },
            },
          ],
          else: [
            {
              name: 'if-false',
              type: 'console.log',
              with: {
                message: 'If false',
              },
            },
          ],
        },
      ],
      consts: {
        test: 'test',
      },
    },
  };
  const workflowGraph = getWorkflowGraph(definition);

  it('should return the root context for the first step', () => {
    const context = getContextForPath(definition, workflowGraph, ['workflow', 'steps', 0]);

    expect(context).toEqual({
      consts: {
        test: 'test',
      },
      secrets: {},
      steps: {},
    });
  });

  it('should return the context for the second step', () => {
    const context2 = getContextForPath(definition, workflowGraph, [
      'workflow',
      'steps',
      1,
      'with',
      'message',
    ]);

    expect(context2).toEqual({
      consts: {
        test: 'test',
      },
      secrets: {},
      steps: {
        'first-step': {},
      },
    });
  });

  it('should return the context for second step in true branch of if-split', () => {
    const context = getContextForPath(definition, workflowGraph, [
      'workflow',
      'steps',
      2,
      'steps',
      1,
      'with',
      'message',
    ]);

    expect(context).toEqual({
      consts: {
        test: 'test',
      },
      secrets: {},
      steps: {
        'first-step': {},
        'second-step': {},
        'if-split': {},
        'if-true-1': {},
      },
    });
  });

  it('should return the context for first step in false branch of if-split', () => {
    const context = getContextForPath(definition, workflowGraph, [
      'workflow',
      'steps',
      2,
      'else',
      0,
      'with',
      'message',
    ]);

    expect(context).toEqual({
      consts: {
        test: 'test',
      },
      secrets: {},
      steps: {
        'first-step': {},
        'second-step': {},
        'if-split': {},
      },
    });
  });
});
