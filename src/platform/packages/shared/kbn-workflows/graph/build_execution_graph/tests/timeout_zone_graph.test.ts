/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { graphlib } from '@dagrejs/dagre';
import type { ConnectorStep, WorkflowYaml } from '../../../spec/schema';
import { convertToWorkflowGraph } from '../build_execution_graph';

describe('convertToWorkflowGraph', () => {
  describe('atomic steps', () => {
    const workflowDefinition = {
      steps: [
        {
          name: 'testAtomicStep1',
          type: 'slack',
          connectorId: 'slack',
          timeout: '30s',
          with: {
            message: 'Hello from atomic step 1',
          },
        } as ConnectorStep,
      ],
    } as Partial<WorkflowYaml>;

    it('should return nodes for atomic step in correct topological order', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const topSort = graphlib.alg.topsort(executionGraph);
      expect(topSort).toEqual([
        'enterTimeoutZone_testAtomicStep1',
        'testAtomicStep1',
        'exitTimeoutZone_testAtomicStep1',
      ]);
    });

    it('should return correct edges for timeout graph', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const edges = executionGraph.edges();
      expect(edges).toEqual([
        {
          v: 'enterTimeoutZone_testAtomicStep1',
          w: 'testAtomicStep1',
        },
        {
          v: 'testAtomicStep1',
          w: 'exitTimeoutZone_testAtomicStep1',
        },
      ]);
    });

    it('should configure enter timeout zone', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const node = executionGraph.node('enterTimeoutZone_testAtomicStep1');
      expect(node).toEqual({
        id: 'enterTimeoutZone_testAtomicStep1',
        type: 'enter-timeout-zone',
        stepId: 'testAtomicStep1',
        stepType: 'slack',
        timeout: '30s',
      });
    });

    it('should configure exit timeout zone', () => {
      const executionGraph = convertToWorkflowGraph(workflowDefinition as any);
      const node = executionGraph.node('exitTimeoutZone_testAtomicStep1');
      expect(node).toEqual({
        id: 'exitTimeoutZone_testAtomicStep1',
        type: 'exit-timeout-zone',
        stepId: 'testAtomicStep1',
        stepType: 'slack',
      });
    });
  });
});
