/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import YAML from 'yaml';
import { monaco } from '@kbn/monaco';
import { WorkflowDefinitionProvider } from './workflow_definition_provider';
import type { WorkflowLookup } from '../../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';

jest.mock('../template_expression/parse_template_at_position');

const { parseTemplateAtPosition } = jest.requireMock(
  '../template_expression/parse_template_at_position'
);

const WORKFLOW_YAML = `name: test-workflow
enabled: false
triggers:
  - type: manual
consts:
  my_setting: "hello"
inputs:
  - name: my_input
    type: string
  - name: other_input
    type: number
steps:
  - name: get_data
    type: elasticsearch.request
    with:
      method: GET
      path: "/my-index/_search"

  - name: set_vars
    type: data.set
    with:
      result_count: "{{ steps.get_data.output.hits.total }}"

  - name: iterate
    type: foreach
    foreach: "{{ steps.get_data.output.hits.hits }}"
    steps:
      - name: process
        type: console
        with:
          message: "{{ foreach.item.key }} {{ steps.get_data.output | entries }}"

  - name: loop_step
    type: while
    condition: "{{ while.iteration < 5 }}"
    steps:
      - name: inner
        type: console
        with:
          message: "iteration {{ while.iteration }}"
`;

const yamlDocument = YAML.parseDocument(WORKFLOW_YAML);

const createMockModel = () => {
  const lines = WORKFLOW_YAML.split('\n');
  return {
    uri: { toString: () => 'inmemory://test' },
    getLineContent: jest.fn((lineNumber: number) => lines[lineNumber - 1] || ''),
    getPositionAt: jest.fn((offset: number) => {
      let remaining = offset;
      for (let i = 0; i < lines.length; i++) {
        if (remaining <= lines[i].length) {
          return { lineNumber: i + 1, column: remaining + 1 };
        }
        remaining -= lines[i].length + 1;
      }
      return { lineNumber: lines.length, column: 1 };
    }),
  } as unknown as monaco.editor.ITextModel;
};

const createWorkflowLookup = (): WorkflowLookup => ({
  steps: {
    get_data: {
      stepId: 'get_data',
      stepType: 'elasticsearch.request',
      lineStart: 13,
      lineEnd: 17,
      propInfos: {
        type: { path: ['type'], keyNode: {} as any, valueNode: {} as any },
      },
      stepYamlNode: {} as any,
    },
    set_vars: {
      stepId: 'set_vars',
      stepType: 'data.set',
      lineStart: 19,
      lineEnd: 22,
      propInfos: {
        type: { path: ['type'], keyNode: {} as any, valueNode: {} as any },
        'with.result_count': {
          path: ['with', 'result_count'],
          keyNode: {} as any,
          valueNode: {} as any,
        },
      },
      stepYamlNode: {} as any,
    },
    iterate: {
      stepId: 'iterate',
      stepType: 'foreach',
      lineStart: 24,
      lineEnd: 30,
      propInfos: {
        type: { path: ['type'], keyNode: {} as any, valueNode: {} as any },
        foreach: {
          path: ['foreach'],
          keyNode: { range: [WORKFLOW_YAML.indexOf('foreach: "{{ steps')] } as any,
          valueNode: {} as any,
        },
      },
      stepYamlNode: {} as any,
    },
    process: {
      stepId: 'process',
      stepType: 'console',
      lineStart: 28,
      lineEnd: 30,
      parentStepId: 'iterate',
      propInfos: {
        type: { path: ['type'], keyNode: {} as any, valueNode: {} as any },
      },
      stepYamlNode: {} as any,
    },
    loop_step: {
      stepId: 'loop_step',
      stepType: 'while',
      lineStart: 32,
      lineEnd: 37,
      propInfos: {
        type: { path: ['type'], keyNode: {} as any, valueNode: {} as any },
        condition: {
          path: ['condition'],
          keyNode: { range: [WORKFLOW_YAML.indexOf('condition: "{{ while')] } as any,
          valueNode: {} as any,
        },
      },
      stepYamlNode: {} as any,
    },
    inner: {
      stepId: 'inner',
      stepType: 'console',
      lineStart: 35,
      lineEnd: 37,
      parentStepId: 'loop_step',
      propInfos: {
        type: { path: ['type'], keyNode: {} as any, valueNode: {} as any },
      },
      stepYamlNode: {} as any,
    },
  },
  triggersLineStart: 3,
});

const makeTemplateInfo = (overrides: Record<string, unknown>) => ({
  isInsideTemplate: true,
  expression: 'steps.get_data.output',
  variablePath: 'steps.get_data.output',
  pathSegments: ['steps', 'get_data', 'output'],
  cursorSegmentIndex: 1,
  pathUpToCursor: ['steps', 'get_data'],
  filters: [],
  isOnFilter: false,
  templateRange: new monaco.Range(1, 10, 1, 30),
  ...overrides,
});

describe('WorkflowDefinitionProvider', () => {
  let provider: WorkflowDefinitionProvider;
  let model: ReturnType<typeof createMockModel>;
  let lookup: WorkflowLookup;

  beforeEach(() => {
    jest.clearAllMocks();
    model = createMockModel();
    lookup = createWorkflowLookup();
    provider = new WorkflowDefinitionProvider({
      getWorkflowLookup: () => lookup,
      getYamlDocument: () => yamlDocument,
    });
  });

  describe('steps', () => {
    it('navigates to step definition when cursor is on step name', () => {
      parseTemplateAtPosition.mockReturnValue(
        makeTemplateInfo({
          pathSegments: ['steps', 'get_data', 'output'],
          cursorSegmentIndex: 1,
        })
      );

      const result = provider.provideDefinition(model, new monaco.Position(1, 1));
      expect(result).not.toBeNull();
      expect((result as monaco.languages.Location).range.startLineNumber).toBe(13);
    });

    it('navigates to steps section header when cursor is on "steps" keyword', () => {
      parseTemplateAtPosition.mockReturnValue(
        makeTemplateInfo({
          pathSegments: ['steps', 'get_data', 'output'],
          cursorSegmentIndex: 0,
        })
      );

      const result = provider.provideDefinition(model, new monaco.Position(1, 1));
      expect(result).not.toBeNull();
    });

    it('does NOT navigate when cursor is on output/data (segment 2+)', () => {
      parseTemplateAtPosition.mockReturnValue(
        makeTemplateInfo({
          pathSegments: ['steps', 'get_data', 'output'],
          cursorSegmentIndex: 2,
        })
      );

      const result = provider.provideDefinition(model, new monaco.Position(1, 1));
      expect(result).toBeNull();
    });
  });

  describe('consts', () => {
    it('navigates to const key definition', () => {
      parseTemplateAtPosition.mockReturnValue(
        makeTemplateInfo({
          pathSegments: ['consts', 'my_setting'],
          cursorSegmentIndex: 1,
        })
      );

      const result = provider.provideDefinition(model, new monaco.Position(1, 1));
      expect(result).not.toBeNull();
    });
  });

  describe('inputs', () => {
    it('navigates to input definition in legacy array format', () => {
      parseTemplateAtPosition.mockReturnValue(
        makeTemplateInfo({
          pathSegments: ['inputs', 'my_input'],
          cursorSegmentIndex: 1,
        })
      );

      const result = provider.provideDefinition(model, new monaco.Position(1, 1));
      expect(result).not.toBeNull();
    });

    it('navigates to input definition in JSON Schema format', () => {
      const jsonSchemaYaml = `name: test
inputs:
  type: object
  properties:
    my_field:
      type: string
steps:
  - name: step1
    type: console
    with:
      message: "{{ inputs.my_field }}"
`;
      const jsonSchemaDoc = YAML.parseDocument(jsonSchemaYaml);
      const jsonSchemaModel = {
        ...model,
        getLineContent: jest.fn(
          (lineNumber: number) => jsonSchemaYaml.split('\n')[lineNumber - 1] || ''
        ),
        getPositionAt: jest.fn((offset: number) => {
          const lines = jsonSchemaYaml.split('\n');
          let remaining = offset;
          for (let i = 0; i < lines.length; i++) {
            if (remaining <= lines[i].length) {
              return { lineNumber: i + 1, column: remaining + 1 };
            }
            remaining -= lines[i].length + 1;
          }
          return { lineNumber: lines.length, column: 1 };
        }),
      } as unknown as monaco.editor.ITextModel;

      const jsonSchemaProvider = new WorkflowDefinitionProvider({
        getWorkflowLookup: () => lookup,
        getYamlDocument: () => jsonSchemaDoc,
      });

      parseTemplateAtPosition.mockReturnValue(
        makeTemplateInfo({
          pathSegments: ['inputs', 'my_field'],
          cursorSegmentIndex: 1,
        })
      );

      const result = jsonSchemaProvider.provideDefinition(
        jsonSchemaModel,
        new monaco.Position(1, 1)
      );
      expect(result).not.toBeNull();
    });
  });

  describe('variables', () => {
    it('navigates to the data.set step that defines the variable', () => {
      parseTemplateAtPosition.mockReturnValue(
        makeTemplateInfo({
          pathSegments: ['variables', 'result_count'],
          cursorSegmentIndex: 1,
        })
      );

      const result = provider.provideDefinition(model, new monaco.Position(1, 1));
      expect(result).not.toBeNull();
      expect((result as monaco.languages.Location).range.startLineNumber).toBe(19);
    });
  });

  describe('foreach', () => {
    it('navigates to foreach property line when cursor is on "foreach" keyword', () => {
      parseTemplateAtPosition.mockReturnValue(
        makeTemplateInfo({
          pathSegments: ['foreach', 'item'],
          cursorSegmentIndex: 0,
          templateRange: new monaco.Range(29, 10, 29, 30),
        })
      );

      const result = provider.provideDefinition(model, new monaco.Position(29, 10));
      expect(result).not.toBeNull();
    });

    it('does NOT navigate when cursor is on foreach.item (runtime-only)', () => {
      parseTemplateAtPosition.mockReturnValue(
        makeTemplateInfo({
          pathSegments: ['foreach', 'item'],
          cursorSegmentIndex: 1,
          templateRange: new monaco.Range(29, 10, 29, 30),
        })
      );

      const result = provider.provideDefinition(model, new monaco.Position(29, 10));
      expect(result).toBeNull();
    });
  });

  describe('while', () => {
    it('navigates to while step when cursor is on "while" keyword', () => {
      parseTemplateAtPosition.mockReturnValue(
        makeTemplateInfo({
          pathSegments: ['while', 'iteration'],
          cursorSegmentIndex: 0,
          templateRange: new monaco.Range(36, 10, 36, 30),
        })
      );

      const result = provider.provideDefinition(model, new monaco.Position(36, 10));
      expect(result).not.toBeNull();
    });

    it('does NOT navigate when cursor is on while.iteration (runtime-only)', () => {
      parseTemplateAtPosition.mockReturnValue(
        makeTemplateInfo({
          pathSegments: ['while', 'iteration'],
          cursorSegmentIndex: 1,
          templateRange: new monaco.Range(36, 10, 36, 30),
        })
      );

      const result = provider.provideDefinition(model, new monaco.Position(36, 10));
      expect(result).toBeNull();
    });
  });

  describe('outputs', () => {
    it('navigates to output field definition', () => {
      const outputYaml = `name: test
outputs:
  - name: result
    type: string
steps:
  - name: step1
    type: console
    with:
      message: "{{ outputs.result }}"
`;
      const outputDoc = YAML.parseDocument(outputYaml);
      const outputModel = {
        ...model,
        getLineContent: jest.fn(
          (lineNumber: number) => outputYaml.split('\n')[lineNumber - 1] || ''
        ),
        getPositionAt: jest.fn((offset: number) => {
          const lines = outputYaml.split('\n');
          let remaining = offset;
          for (let i = 0; i < lines.length; i++) {
            if (remaining <= lines[i].length) {
              return { lineNumber: i + 1, column: remaining + 1 };
            }
            remaining -= lines[i].length + 1;
          }
          return { lineNumber: lines.length, column: 1 };
        }),
      } as unknown as monaco.editor.ITextModel;

      const outputProvider = new WorkflowDefinitionProvider({
        getWorkflowLookup: () => lookup,
        getYamlDocument: () => outputDoc,
      });

      parseTemplateAtPosition.mockReturnValue(
        makeTemplateInfo({
          pathSegments: ['outputs', 'result'],
          cursorSegmentIndex: 1,
        })
      );

      const result = outputProvider.provideDefinition(outputModel, new monaco.Position(1, 1));
      expect(result).not.toBeNull();
    });
  });

  describe('filters', () => {
    it('does NOT navigate when cursor is on a filter even if cursorSegmentIndex matches', () => {
      parseTemplateAtPosition.mockReturnValue(
        makeTemplateInfo({
          pathSegments: ['steps', 'get_data'],
          cursorSegmentIndex: 1,
          filters: ['entries'],
          isOnFilter: true,
          expression: 'steps.get_data | entries',
        })
      );

      const result = provider.provideDefinition(model, new monaco.Position(1, 1));
      expect(result).toBeNull();
    });
  });
});
