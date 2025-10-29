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
import type { z } from '@kbn/zod';
import type { AutocompleteContext, MinimalWorkflowDetailState } from './autocomplete.types';
import { getFocusedYamlPair } from './get_focused_yaml_pair';
import { isInsideLiquidBlock } from './liquid_utils';
import { parseLineForCompletion } from './parse_line_for_completion';
import { getCurrentPath } from '../../../../../common/lib/yaml';
import { getSchemaAtPath } from '../../../../../common/lib/zod';
import { getContextSchemaForPath } from '../../../../features/workflow_context/lib/get_context_for_path';
import { getConnectorTypeFromContext } from '../snippets/generate_connector_snippet';
import type { StepInfo } from '../store';

export function buildAutocompleteContext(
  editorState: MinimalWorkflowDetailState,
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  completionContext: monaco.languages.CompletionContext
): AutocompleteContext | null {
  const currentDynamicConnectorTypes = editorState?.connectors?.connectorTypes;
  const workflowGraph = editorState?.computed?.workflowGraph;
  const yamlDocument = editorState?.computed?.yamlDocument;
  const workflowLookup = editorState?.computed?.workflowLookup;
  const focusedStepId = editorState?.focusedStepId;
  const workflowDefinition = editorState?.computed?.workflowDefinition;
  const absolutePosition = model.getOffsetAt(position);
  const { lineNumber } = position;
  const line = model.getLineContent(lineNumber);
  const wordUntil = model.getWordUntilPosition(position);
  const word = model.getWordAtPosition(position) || wordUntil;
  const { startColumn, endColumn } = word;

  const focusedYamlPair = getFocusedYamlPair(workflowLookup, focusedStepId, absolutePosition);
  let shouldUseCurlyBraces = true;
  const focusedStepInfo: StepInfo | null = null;

  if (!yamlDocument) {
    return null;
  }

  if (completionContext.triggerCharacter === '@' && focusedYamlPair) {
    shouldUseCurlyBraces = focusedYamlPair.keyNode.value !== 'foreach';
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
    // Normal range calculation
    range = {
      startLineNumber: lineNumber,
      endLineNumber: lineNumber,
      startColumn,
      endColumn,
    };
  }

  const path = getCurrentPath(yamlDocument, absolutePosition);
  const yamlNode = yamlDocument.getIn(path, true);
  const scalarType = isScalar(yamlNode) ? yamlNode.type ?? null : null;
  const shouldBeQuoted = scalarType === null || scalarType === 'PLAIN';

  // First check if we're in a connector's with block (using enhanced detection)
  const connectorType = getConnectorTypeFromContext(yamlDocument, path, model, position);

  let contextSchema: z.ZodType = DynamicStepContextSchema;
  const lineUpToCursor = line.substring(0, position.column - 1);
  const parseResult = parseLineForCompletion(lineUpToCursor);

  try {
    // For variable expressions, we want the root context with consts, event, workflow, etc.
    contextSchema = getContextSchemaForPath(workflowDefinition, workflowGraph, []);
  } catch (contextError) {
    console.error('Error getting context schema for path', contextError);
  }

  if (parseResult?.fullKey) {
    const schemaAtPath = getSchemaAtPath(contextSchema, parseResult.fullKey, { partial: true });
    if (schemaAtPath) {
      contextSchema = schemaAtPath;
    }
  }

  // Check if we're actually inside a liquid block
  const isInLiquidBlock = isInsideLiquidBlock(model.getValue(), position);

  return {
    triggerCharacter: completionContext.triggerCharacter ?? null,
    triggerKind: completionContext.triggerKind ?? null,
    line,
    lineUpToCursor,
    lineParseResult: parseResult,
    contextSchema,
    focusedStepInfo,
    connectorType,
    yamlDocument,
    scalarType,
    path,
    range,
    absolutePosition,
    dynamicConnectorTypes: currentDynamicConnectorTypes ?? null,
    isInLiquidBlock,
    shouldUseCurlyBraces,
    shouldBeQuoted,
  };
}
