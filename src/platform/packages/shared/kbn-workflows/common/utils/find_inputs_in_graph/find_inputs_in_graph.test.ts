/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findInputsInGraph } from './find_inputs_in_graph';
import { WorkflowGraph } from '../../../graph';

import type { EnterForeachNode } from '../../../graph';
import type { ConnectorStep, ForEachStep, IfStep, WorkflowYaml } from '../../../spec/schema';

describe('findInputsInGraph', () => {
  describe('foreach step', () => {
    describe('single level foreach', () => {
      const workflow = {
        steps: [
          {
            name: 'foreachstep',
            type: 'foreach',
            foreach: 'steps.analysis.output.0.result',
            steps: [
              {
                name: 'iterable-step',
                type: 'console',
                with: {
                  message: '{{ foreach.item.name }} {{ foreach.item.surname }}',
                },
              } as ConnectorStep,
            ],
          },
        ],
      } as WorkflowYaml;
      it('should return foreach step inputs if foreach references another step', () => {
        const graph = WorkflowGraph.fromWorkflowDefinition(workflow);
        const stepGraph = graph.getStepGraph('foreachstep');
        const inputs = findInputsInGraph(stepGraph);
        expect(inputs).toEqual({
          foreachstep: ['steps.analysis.output.0.result'],
        });
      });

      it('should return foreach inputs for step inside foreach', () => {
        const graph = WorkflowGraph.fromWorkflowDefinition(workflow);
        const stepGraph = graph.getStepGraph('iterable-step');
        const inputs = findInputsInGraph(stepGraph);
        expect(inputs).toEqual({
          'iterable-step': ['foreach.item.name', 'foreach.item.surname'],
        });
      });

      it('should not return inputs for foreach if in foreach is already array', () => {
        const graph = WorkflowGraph.fromWorkflowDefinition(workflow);
        const stepGraph = graph.getStepGraph('foreachstep');
        (stepGraph.getNode('enterForeach_foreachstep') as EnterForeachNode).configuration.foreach =
          JSON.stringify(['item1', 'item2']);
        const inputs = findInputsInGraph(stepGraph);
        expect(inputs).toEqual({});
      });
    });

    describe('nested foreach', () => {
      const workflow = {
        steps: [
          {
            name: 'outer_foreach',
            type: 'foreach',
            foreach: 'steps.analysis.output.0.result',
            steps: [
              {
                name: 'inner_foreach',
                type: 'foreach',
                foreach: 'foreach.item',
                steps: [
                  {
                    name: 'log-name-surname',
                    type: 'console',
                    with: {
                      message: '{{ foreach.item.name }} {{ foreach.item.surname }}',
                    },
                  } as ConnectorStep,
                ],
              } as ForEachStep,
            ],
          } as ForEachStep,
        ],
      } as WorkflowYaml;

      it('should return foreach step inputs if inside another foreach', () => {
        const graph = WorkflowGraph.fromWorkflowDefinition(workflow);
        const stepGraph = graph.getStepGraph('inner_foreach');
        const inputs = findInputsInGraph(stepGraph);
        expect(inputs).toEqual({
          inner_foreach: ['foreach.item'],
        });
      });
    });
  });

  describe('if step', () => {
    const workflow = {
      steps: [
        {
          name: 'ifstep',
          type: 'if',
          condition: 'event.rule.name:alert or steps.analysis.output:malicious',
          steps: [
            {
              name: 'iterable-step',
              type: 'console',
              with: {
                message: 'Hello World!',
              },
            } as ConnectorStep,
          ],
        } as IfStep,
      ],
    } as WorkflowYaml;

    it('should be able to extract KQL variables', () => {
      const graph = WorkflowGraph.fromWorkflowDefinition(workflow);
      const stepGraph = graph.getStepGraph('ifstep');
      const inputs = findInputsInGraph(stepGraph);
      expect(inputs).toEqual(
        expect.objectContaining({
          ifstep: ['event.rule.name', 'steps.analysis.output'],
        })
      );
    });
  });
});
