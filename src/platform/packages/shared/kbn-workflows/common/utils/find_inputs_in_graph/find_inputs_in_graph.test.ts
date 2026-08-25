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

      it('should return foreach inputs for step inside foreach', () => {
        const graph = WorkflowGraph.fromWorkflowDefinition(workflow);
        const stepGraph = graph.getStepGraph('iterable-step');
        const inputs = findInputsInGraph(stepGraph);
        expect(inputs).toEqual({
          'iterable-step': ['foreach.item.name', 'foreach.item.surname'],
        });
      });

      it('should not return inputs for foreach if in foreach is already array', () => {
        const workflowTemplateForForeach = {
          steps: [
            {
              name: 'foreachstep',
              type: 'foreach',
              foreach: JSON.stringify(['item1', 'item2']),
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
        const graph = WorkflowGraph.fromWorkflowDefinition(workflowTemplateForForeach);
        const stepGraph = graph.getStepGraph('foreachstep');
        const inputs = findInputsInGraph(stepGraph);
        expect(inputs).toEqual({});
      });

      it('should extract template variables from foreach expression with template syntax {{}}', () => {
        const workflowWithTemplateForEach = {
          steps: [
            {
              name: 'foreachstep',
              type: 'foreach',
              foreach: '{{ inputs.people }}',
              steps: [
                {
                  name: 'log-step',
                  type: 'console',
                  with: {
                    message: '{{ foreach.item }}',
                  },
                } as ConnectorStep,
              ],
            },
          ],
        } as WorkflowYaml;
        const graph = WorkflowGraph.fromWorkflowDefinition(workflowWithTemplateForEach);
        const stepGraph = graph.getStepGraph('foreachstep');
        const inputs = findInputsInGraph(stepGraph);
        expect(inputs).toEqual({
          foreachstep: ['inputs.people'],
        });
      });

      it('should extract template variables from foreach expression with expression syntax ${{}}', () => {
        const workflowWithTemplateForEach = {
          steps: [
            {
              name: 'foreachstep',
              type: 'foreach',
              foreach: '${{ inputs.people }}',
              steps: [
                {
                  name: 'log-step',
                  type: 'console',
                  with: {
                    message: '{{ foreach.item }}',
                  },
                } as ConnectorStep,
              ],
            },
          ],
        } as WorkflowYaml;
        const graph = WorkflowGraph.fromWorkflowDefinition(workflowWithTemplateForEach);
        const stepGraph = graph.getStepGraph('foreachstep');
        const inputs = findInputsInGraph(stepGraph);
        expect(inputs).toEqual({
          foreachstep: ['inputs.people'],
        });
      });
    });

    describe('nested foreach', () => {
      const workflow = {
        steps: [
          {
            name: 'outer_foreach',
            type: 'foreach',
            foreach: '{{steps.analysis.output.0.result}}',
            steps: [
              {
                name: 'inner_foreach',
                type: 'foreach',
                foreach: '{{foreach.item}}',
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

  describe('if step with template expressions in condition', () => {
    const workflow = {
      steps: [
        {
          name: 'iterate_people',
          type: 'foreach',
          foreach: '{{ inputs.people }}',
          steps: [
            {
              name: 'check_if_favorite',
              type: 'if',
              condition: 'foreach.item: {{ consts.favorite_person }}',
              steps: [
                {
                  name: 'greet_favorite',
                  type: 'console',
                  with: {
                    message: 'Hello, favorite!',
                  },
                } as ConnectorStep,
              ],
            } as IfStep,
          ],
        } as ForEachStep,
      ],
    } as WorkflowYaml;

    it('should extract both KQL fields and template variables from if condition', () => {
      const graph = WorkflowGraph.fromWorkflowDefinition(workflow);
      const stepGraph = graph.getStepGraph('check_if_favorite');
      const inputs = findInputsInGraph(stepGraph);
      // Should not throw KQLSyntaxError and should extract variables from template
      expect(inputs).toEqual(
        expect.objectContaining({
          check_if_favorite: expect.arrayContaining(['consts.favorite_person']),
        })
      );
    });

    it('should not throw when extracting inputs from foreach with nested if containing template expressions', () => {
      const graph = WorkflowGraph.fromWorkflowDefinition(workflow);
      // This should not throw a KQLSyntaxError
      expect(() => {
        const stepGraph = graph.getStepGraph('iterate_people');
        findInputsInGraph(stepGraph);
      }).not.toThrow();
    });
  });
});
