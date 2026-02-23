/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  analyzeLoops,
  getLoopAnalysisSummary,
  validateNoUnintentionalLoops,
} from './loop_detection_analyzer';
import type { ConnectorStep, ForEachStep, WorkflowYaml } from '../../spec/schema';
import { WorkflowGraph } from '../workflow_graph/workflow_graph';

describe('Loop Detection Analyzer', () => {
  describe('analyzeLoops', () => {
    describe('acyclic workflows', () => {
      it('should report no cycles for a simple linear workflow', () => {
        const workflowDefinition = {
          steps: [
            {
              name: 'step1',
              type: 'slack',
              connectorId: 'slack',
              with: { message: 'Hello' },
            } as ConnectorStep,
            {
              name: 'step2',
              type: 'slack',
              connectorId: 'slack',
              with: { message: 'World' },
            } as ConnectorStep,
          ],
        } as Partial<WorkflowYaml>;

        const graph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
        const result = analyzeLoops(graph);

        expect(result.isAcyclic).toBe(true);
        expect(result.hasCycles).toBe(false);
        expect(result.loops).toHaveLength(0);
        expect(result.unintentionalLoops).toHaveLength(0);
        expect(result.intentionalLoops).toHaveLength(0);
      });

      it('should report no cycles for a workflow with conditional branches', () => {
        const workflowDefinition = {
          steps: [
            {
              name: 'ifStep',
              type: 'if',
              condition: 'true',
              steps: [
                {
                  name: 'thenStep',
                  type: 'slack',
                  connectorId: 'slack',
                  with: { message: 'Then branch' },
                } as ConnectorStep,
              ],
              else: [
                {
                  name: 'elseStep',
                  type: 'slack',
                  connectorId: 'slack',
                  with: { message: 'Else branch' },
                } as ConnectorStep,
              ],
            },
          ],
        } as Partial<WorkflowYaml>;

        const graph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
        const result = analyzeLoops(graph);

        expect(result.isAcyclic).toBe(true);
        expect(result.unintentionalLoops).toHaveLength(0);
      });
    });

    describe('intentional loops (foreach)', () => {
      it('should detect foreach loops as intentional', () => {
        const workflowDefinition = {
          steps: [
            {
              name: 'foreachStep',
              type: 'foreach',
              foreach: '["item1", "item2"]',
              steps: [
                {
                  name: 'innerStep',
                  type: 'slack',
                  connectorId: 'slack',
                  with: { message: 'Processing item' },
                } as ConnectorStep,
              ],
            } as ForEachStep,
          ],
        } as Partial<WorkflowYaml>;

        const graph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
        const result = analyzeLoops(graph);

        expect(result.isAcyclic).toBe(true);
        expect(result.hasCycles).toBe(true);
        expect(result.intentionalLoops).toHaveLength(1);
        expect(result.intentionalLoops[0].type).toBe('foreach');
        expect(result.intentionalLoops[0].isIntentional).toBe(true);
        expect(result.unintentionalLoops).toHaveLength(0);
      });

      it('should detect nested foreach loops as intentional', () => {
        const workflowDefinition = {
          steps: [
            {
              name: 'outerForeach',
              type: 'foreach',
              foreach: '["outer1", "outer2"]',
              steps: [
                {
                  name: 'innerForeach',
                  type: 'foreach',
                  foreach: '["inner1", "inner2"]',
                  steps: [
                    {
                      name: 'nestedStep',
                      type: 'slack',
                      connectorId: 'slack',
                      with: { message: 'Nested' },
                    } as ConnectorStep,
                  ],
                } as ForEachStep,
              ],
            } as ForEachStep,
          ],
        } as Partial<WorkflowYaml>;

        const graph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
        const result = analyzeLoops(graph);

        expect(result.isAcyclic).toBe(true);
        expect(result.intentionalLoops).toHaveLength(2);
        expect(result.intentionalLoops.every((loop) => loop.type === 'foreach')).toBe(true);
        expect(result.intentionalLoops.every((loop) => loop.isIntentional)).toBe(true);
      });

      it('should detect step-level foreach as intentional', () => {
        const workflowDefinition = {
          steps: [
            {
              name: 'stepWithForeach',
              type: 'slack',
              connectorId: 'slack',
              foreach: '["item1", "item2"]',
              with: { message: 'Processing' },
            } as ConnectorStep,
          ],
        } as Partial<WorkflowYaml>;

        const graph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
        const result = analyzeLoops(graph);

        expect(result.isAcyclic).toBe(true);
        expect(result.intentionalLoops).toHaveLength(1);
        expect(result.intentionalLoops[0].type).toBe('foreach');
      });
    });

    describe('intentional loops (retry)', () => {
      it('should detect retry loops as intentional', () => {
        const workflowDefinition = {
          steps: [
            {
              name: 'stepWithRetry',
              type: 'slack',
              connectorId: 'slack',
              'on-failure': {
                retry: {
                  'max-attempts': 3,
                  delay: '1s',
                },
              },
              with: { message: 'Will retry' },
            } as ConnectorStep,
          ],
        } as Partial<WorkflowYaml>;

        const graph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
        const result = analyzeLoops(graph);

        expect(result.isAcyclic).toBe(true);
        expect(result.intentionalLoops.some((loop) => loop.type === 'retry')).toBe(true);
        expect(result.unintentionalLoops).toHaveLength(0);
      });
    });

    describe('complex workflows', () => {
      it('should handle workflows with both foreach and conditional branches', () => {
        const workflowDefinition = {
          steps: [
            {
              name: 'initialStep',
              type: 'slack',
              connectorId: 'slack',
              with: { message: 'Start' },
            } as ConnectorStep,
            {
              name: 'foreachStep',
              type: 'foreach',
              foreach: '["a", "b"]',
              steps: [
                {
                  name: 'conditionalStep',
                  type: 'if',
                  condition: 'true',
                  steps: [
                    {
                      name: 'thenStep',
                      type: 'slack',
                      connectorId: 'slack',
                      with: { message: 'Then' },
                    } as ConnectorStep,
                  ],
                },
              ],
            } as ForEachStep,
            {
              name: 'finalStep',
              type: 'slack',
              connectorId: 'slack',
              with: { message: 'End' },
            } as ConnectorStep,
          ],
        } as Partial<WorkflowYaml>;

        const graph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
        const result = analyzeLoops(graph);

        expect(result.isAcyclic).toBe(true);
        expect(result.intentionalLoops.length).toBeGreaterThanOrEqual(1);
        expect(result.unintentionalLoops).toHaveLength(0);
      });
    });
  });

  describe('validateNoUnintentionalLoops', () => {
    it('should not throw for acyclic workflows', () => {
      const workflowDefinition = {
        steps: [
          {
            name: 'step1',
            type: 'slack',
            connectorId: 'slack',
            with: { message: 'Hello' },
          } as ConnectorStep,
        ],
      } as Partial<WorkflowYaml>;

      const graph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);

      expect(() => validateNoUnintentionalLoops(graph)).not.toThrow();
    });

    it('should not throw for workflows with intentional loops only', () => {
      const workflowDefinition = {
        steps: [
          {
            name: 'foreachStep',
            type: 'foreach',
            foreach: '["item1", "item2"]',
            steps: [
              {
                name: 'innerStep',
                type: 'slack',
                connectorId: 'slack',
                with: { message: 'Processing' },
              } as ConnectorStep,
            ],
          } as ForEachStep,
        ],
      } as Partial<WorkflowYaml>;

      const graph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);

      expect(() => validateNoUnintentionalLoops(graph)).not.toThrow();
    });
  });

  describe('getLoopAnalysisSummary', () => {
    it('should generate a readable summary for a simple workflow', () => {
      const workflowDefinition = {
        steps: [
          {
            name: 'step1',
            type: 'slack',
            connectorId: 'slack',
            with: { message: 'Hello' },
          } as ConnectorStep,
        ],
      } as Partial<WorkflowYaml>;

      const graph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
      const result = analyzeLoops(graph);
      const summary = getLoopAnalysisSummary(result);

      expect(summary).toContain('Loop Analysis Summary');
      expect(summary).toContain('Acyclic (no problems): true');
      expect(summary).toContain('Total loops detected: 0');
    });

    it('should generate a readable summary for a workflow with foreach', () => {
      const workflowDefinition = {
        steps: [
          {
            name: 'foreachStep',
            type: 'foreach',
            foreach: '["item1"]',
            steps: [
              {
                name: 'innerStep',
                type: 'slack',
                connectorId: 'slack',
                with: { message: 'Processing' },
              } as ConnectorStep,
            ],
          } as ForEachStep,
        ],
      } as Partial<WorkflowYaml>;

      const graph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
      const result = analyzeLoops(graph);
      const summary = getLoopAnalysisSummary(result);

      expect(summary).toContain('Loop Analysis Summary');
      expect(summary).toContain('Intentional loops: 1');
      expect(summary).toContain('[foreach]');
    });
  });

  describe('edge cases', () => {
    it('should handle empty workflows', () => {
      const workflowDefinition = {
        steps: [],
      } as Partial<WorkflowYaml>;

      const graph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
      const result = analyzeLoops(graph);

      expect(result.isAcyclic).toBe(true);
      expect(result.hasCycles).toBe(false);
      expect(result.loops).toHaveLength(0);
    });

    it('should handle single-step workflows', () => {
      const workflowDefinition = {
        steps: [
          {
            name: 'singleStep',
            type: 'slack',
            connectorId: 'slack',
            with: { message: 'Only step' },
          } as ConnectorStep,
        ],
      } as Partial<WorkflowYaml>;

      const graph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
      const result = analyzeLoops(graph);

      expect(result.isAcyclic).toBe(true);
      expect(result.hasCycles).toBe(false);
    });

    it('should handle deeply nested structures', () => {
      const workflowDefinition = {
        steps: [
          {
            name: 'level1',
            type: 'foreach',
            foreach: '["a"]',
            steps: [
              {
                name: 'level2',
                type: 'if',
                condition: 'true',
                steps: [
                  {
                    name: 'level3',
                    type: 'foreach',
                    foreach: '["b"]',
                    steps: [
                      {
                        name: 'deepStep',
                        type: 'slack',
                        connectorId: 'slack',
                        with: { message: 'Deep' },
                      } as ConnectorStep,
                    ],
                  } as ForEachStep,
                ],
              },
            ],
          } as ForEachStep,
        ],
      } as Partial<WorkflowYaml>;

      const graph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);
      const result = analyzeLoops(graph);

      expect(result.isAcyclic).toBe(true);
      // Should have 2 intentional foreach loops
      expect(result.intentionalLoops.filter((l) => l.type === 'foreach')).toHaveLength(2);
    });
  });

  describe('manual graph manipulation (testing cycle detection)', () => {
    it('should detect self-references when manually added', () => {
      // Create a mock workflow graph with a self-referencing edge
      const workflowDefinition = {
        steps: [
          {
            name: 'step1',
            type: 'slack',
            connectorId: 'slack',
            with: { message: 'Hello' },
          } as ConnectorStep,
        ],
      } as Partial<WorkflowYaml>;

      const graph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);

      // Create a mock that includes a self-reference in edges
      const mockGraph = {
        getAllNodes: () => graph.getAllNodes(),
        getEdges: () => [...graph.getEdges(), { v: 'step1', w: 'step1' }], // Self-reference
        getNode: (id: string) => graph.getNode(id),
      } as unknown as WorkflowGraph;

      const result = analyzeLoops(mockGraph);

      expect(result.isAcyclic).toBe(false);
      expect(result.unintentionalLoops.length).toBeGreaterThan(0);
      expect(result.unintentionalLoops.some((l) => l.type === 'self-reference')).toBe(true);
    });

    it('should detect circular dependencies when manually added', () => {
      const workflowDefinition = {
        steps: [
          {
            name: 'step1',
            type: 'slack',
            connectorId: 'slack',
            with: { message: 'Hello' },
          } as ConnectorStep,
          {
            name: 'step2',
            type: 'slack',
            connectorId: 'slack',
            with: { message: 'World' },
          } as ConnectorStep,
        ],
      } as Partial<WorkflowYaml>;

      const graph = WorkflowGraph.fromWorkflowDefinition(workflowDefinition as WorkflowYaml);

      // Create a mock that adds a back-edge creating a cycle
      const mockGraph = {
        getAllNodes: () => graph.getAllNodes(),
        getEdges: () => [
          ...graph.getEdges(),
          { v: 'step2', w: 'step1' }, // Creates cycle: step1 -> step2 -> step1
        ],
        getNode: (id: string) => graph.getNode(id),
      } as unknown as WorkflowGraph;

      const result = analyzeLoops(mockGraph);

      expect(result.isAcyclic).toBe(false);
      expect(result.unintentionalLoops.length).toBeGreaterThan(0);
    });
  });
});
