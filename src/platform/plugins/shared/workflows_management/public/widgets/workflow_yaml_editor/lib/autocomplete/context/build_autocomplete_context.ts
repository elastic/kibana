/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isScalar } from 'yaml';
import type { monaco } from '@kbn/monaco';
import { DynamicStepContextSchema } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';
import type { AutocompleteContext } from './autocomplete.types';
import { getFocusedYamlPair } from './get_focused_yaml_pair';
import { isInsideLiquidBlock } from './liquid_utils';
import { parseLineForCompletion } from './parse_line_for_completion';
import {
  isInScheduledTriggerWithBlock,
  isInStepsContext,
  isInTriggersContext,
} from './triggers_utils';
import { getPathAtOffset } from '../../../../../../common/lib/yaml';
import { getSchemaAtPath } from '../../../../../../common/lib/zod';
import type { StepInfo, WorkflowDetailState } from '../../../../../entities/workflows/store';
import { getContextSchemaForPath } from '../../../../../features/workflow_context/lib/get_context_for_path';

export interface BuildAutocompleteContextParams {
  editorState: WorkflowDetailState;
  model: monaco.editor.ITextModel;
  position: monaco.Position;
  completionContext: monaco.languages.CompletionContext;
}

export function buildAutocompleteContext({
  editorState,
  model,
  position,
  completionContext,
}: BuildAutocompleteContextParams): AutocompleteContext | null {
  // derived from workflow state
  const currentDynamicConnectorTypes = editorState?.connectors?.connectorTypes;
  const workflowGraph = editorState?.computed?.workflowGraph;
  const yamlDocument = editorState?.computed?.yamlDocument;
  const workflowLookup = editorState?.computed?.workflowLookup;
  const yamlLineCounter = editorState?.computed?.yamlLineCounter;
  const focusedStepId = editorState?.focusedStepId;
  const workflowDefinition = editorState?.computed?.workflowDefinition;
  // monaco-related
  const absoluteOffset = model.getOffsetAt(position);
  const { lineNumber } = position;
  const line = model.getLineContent(lineNumber);
  const word = model.getWordAtPosition(position) || model.getWordUntilPosition(position);
  const { startColumn, endColumn } = word;

  const focusedStepInfo: StepInfo | null = focusedStepId
    ? workflowLookup?.steps[focusedStepId] ?? null
    : null;
  const focusedYamlPair = getFocusedYamlPair(workflowLookup, focusedStepId, absoluteOffset);

  if (!yamlDocument) {
    return null;
  }

  let range: monaco.IRange;
  if (completionContext.triggerCharacter === ' ') {
    // When triggered by space, set range to start at current position
    // This tells Monaco there's no prefix to filter against
    range = {
      startLineNumber: lineNumber,
      endLineNumber: lineNumber,
      startColumn: position.column,
      endColumn: position.column,
    };
  } else {
    // Use word range, but within current line
    range = {
      startLineNumber: lineNumber,
      endLineNumber: lineNumber,
      startColumn,
      endColumn,
    };
  }

  const path = getPathAtOffset(yamlDocument, absoluteOffset);
  const yamlNode = yamlDocument.getIn(path, true);
  const scalarType = isScalar(yamlNode) ? yamlNode.type ?? null : null;

  let contextSchema: z.ZodType = DynamicStepContextSchema;
  let contextScopedToPath: string | null = null;
  const lineUpToCursor = line.substring(0, position.column - 1);
  const parseResult = parseLineForCompletion(lineUpToCursor);

  if (workflowDefinition && workflowGraph) {
    contextSchema = getContextSchemaForPath(workflowDefinition, workflowGraph, path, yamlDocument);
  }

  if (parseResult?.fullKey) {
    const { schema: schemaAtPath, scopedToPath } = getSchemaAtPath(
      contextSchema,
      parseResult.fullKey,
      { partial: true }
    );
    if (schemaAtPath) {
      contextSchema = schemaAtPath;
      contextScopedToPath = scopedToPath;
    }
  }

  // Check if we're actually inside a liquid block
  const isInLiquidBlock = isInsideLiquidBlock(model.getValue(), position);
  const _isInScheduledTriggerWithBlock = isInScheduledTriggerWithBlock(
    yamlDocument,
    absoluteOffset
  );

  return {
    // what triggered the completion
    triggerCharacter: completionContext.triggerCharacter ?? null,
    triggerKind: completionContext.triggerKind ?? null,

    // content
    line,
    lineUpToCursor,
    lineParseResult: parseResult,

    // position of the cursor
    path,
    range,
    absoluteOffset,
    focusedStepInfo,
    focusedYamlPair,

    // context
    contextSchema,
    contextScopedToPath,
    yamlDocument,
    yamlLineCounter: yamlLineCounter ?? null,
    scalarType,

    // kind of ast info
    isInLiquidBlock,
    isInScheduledTriggerWithBlock: _isInScheduledTriggerWithBlock,
    isInTriggersContext: isInTriggersContext(path),
    isInStepsContext: isInStepsContext(path),

    // dynamic connector types
    dynamicConnectorTypes: currentDynamicConnectorTypes ?? null,

    // workflow definition (for JSON Schema autocompletion)
    workflowDefinition: workflowDefinition ?? null,
  };
}
