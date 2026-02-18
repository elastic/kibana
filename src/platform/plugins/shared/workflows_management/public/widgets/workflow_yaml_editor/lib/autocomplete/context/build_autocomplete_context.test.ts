/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import type { ConnectorTypeInfo } from '@kbn/workflows';
import { expectZodSchemaEqual } from '@kbn/workflows/common/utils/zod/test_utils/expect_zod_schema_equal';
import { z } from '@kbn/zod/v4';
import type { BuildAutocompleteContextParams } from './build_autocomplete_context';
import { buildAutocompleteContext } from './build_autocomplete_context';
import { createFakeMonacoModel } from '../../../../../../common/mocks/monaco_model';
import type { WorkflowDetailState } from '../../../../../entities/workflows/store/workflow_detail/types';
import { performComputation } from '../../../../../entities/workflows/store/workflow_detail/utils/computation';
import { findStepByLine } from '../../../../../entities/workflows/store/workflow_detail/utils/step_finder';

jest.mock('../../../../../features/workflow_context/lib/get_output_schema_for_step_type');

export function getFakeAutocompleteContextParams(
  yamlContent: string,
  customConnectorTypes?: Record<string, ConnectorTypeInfo>
): BuildAutocompleteContextParams {
  const defaultConnectorTypes: Record<string, ConnectorTypeInfo> = {
    console: {
      actionTypeId: 'console',
      displayName: 'Console',
      instances: [],
      minimumLicenseRequired: 'basic',
      subActions: [],
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
    },
  };

  const connectorTypes = customConnectorTypes || defaultConnectorTypes;

  const cursorOffset = yamlContent.indexOf('|<-');
  const cleanedYaml = yamlContent.replace('|<-', '');
  const mockModel = createFakeMonacoModel(cleanedYaml, cursorOffset);
  const position = mockModel.getPositionAt(cursorOffset);
  const triggerCharacter = cleanedYaml.slice(cursorOffset - 1, cursorOffset);
  const computedData = performComputation(cleanedYaml);
  const mockEditorState = {
    yamlString: cleanedYaml,
    focusedStepId: computedData?.workflowLookup
      ? findStepByLine(position.lineNumber, computedData.workflowLookup)
      : undefined,
    computed: computedData,
    connectors: { connectorTypes, totalConnectors: Object.keys(connectorTypes).length },
  } as WorkflowDetailState;

  return {
    model: mockModel as unknown as monaco.editor.ITextModel,
    position: position as monaco.Position,
    completionContext: {
      triggerKind: monaco.languages.CompletionTriggerKind.TriggerCharacter,
      triggerCharacter,
    } as monaco.languages.CompletionContext,
    editorState: mockEditorState,
  };
}

describe('buildAutocompleteContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null if the yaml is empty', () => {
    const result = buildAutocompleteContext(getFakeAutocompleteContextParams(''));

    expect(result).toBeNull();
  });

  it('should return an autocomplete context if the yaml document is not null', () => {
    const result = buildAutocompleteContext(getFakeAutocompleteContextParams('name: "test"'));

    expect(result).toBeDefined();
  });

  it('should have consts in the context schema', () => {
    const result = buildAutocompleteContext(
      getFakeAutocompleteContextParams(`
name: "test"
consts:
  stringConst: "test-const"
  numberConst: 1
  booleanConst: true
  arrayConst: [1, 2, 3]
  objectConst: { key: "value" }
steps:
  - name: "first-step"
    type: "console"
    with:
      message: "|<-"
`)
    );

    expect(result?.contextSchema).toBeDefined();
    expect((result?.contextSchema as z.ZodObject<any>).shape.consts).toBeDefined();
    const constsShape = (result?.contextSchema as z.ZodObject<any>).shape.consts.shape;
    expectZodSchemaEqual(constsShape.stringConst, z.literal('test-const'));
    expectZodSchemaEqual(constsShape.numberConst, z.literal(1));
    expectZodSchemaEqual(constsShape.booleanConst, z.literal(true));
    expectZodSchemaEqual(constsShape.arrayConst, z.array(z.literal(1)).length(3));
    expectZodSchemaEqual(constsShape.objectConst, z.object({ key: z.literal('value') }));
  });

  it('should have steps outputs in the context schema', () => {
    const result = buildAutocompleteContext(
      getFakeAutocompleteContextParams(`
name: "test"
steps:
  - name: first-step
    type: console
    with:
      message: hello
  - name: second-step
    type: console
    with:
      message: "|<-"
`)
    );

    expect(result?.contextSchema).toBeDefined();
    expect((result?.contextSchema as z.ZodObject<any>).shape.steps).toBeDefined();
    const stepsShape = (result?.contextSchema as z.ZodObject<any>).shape.steps.shape;
    expect(stepsShape['first-step']).toBeDefined();
    expectZodSchemaEqual(
      stepsShape['first-step'],
      z.object({ output: z.string().optional(), error: z.any().optional() })
    );
  });

  it('should have steps outputs in the context schema for nested steps', () => {
    const result = buildAutocompleteContext(
      getFakeAutocompleteContextParams(`version: "1"
name: "test"
consts:
  apiUrl: "https://api.example.com"
steps:
  - name: if-step
    type: if
    with:
      condition: "something:something"
    steps:
      - name: first-true-step
        type: console
        with:
          message: "im true"
      - name: second-true-step
        type: console
        with:
          message: "im true, {{steps.|<-}}"
    else: 
      - name: false-step
        type: console
        with:
          message: "im unreachable"
`)
    );

    expect(result?.contextSchema).toBeDefined();
    const stepsShape = (result?.contextSchema as z.ZodObject<any>).shape;
    expect(stepsShape['first-true-step']).toBeDefined();
    expectZodSchemaEqual(
      stepsShape['first-true-step'],
      z.object({ output: z.string().optional(), error: z.any().optional() })
    );
  });

  it('should detect if we are in a scheduled trigger with block', () => {
    const result = buildAutocompleteContext(
      getFakeAutocompleteContextParams(`
version: "1"
name: "test"
triggers:
  - type: scheduled
    enabled: true
    with:
      |<-
steps: []
`)
    );

    expect(result?.isInScheduledTriggerWithBlock).toBe(true);
  });
});
