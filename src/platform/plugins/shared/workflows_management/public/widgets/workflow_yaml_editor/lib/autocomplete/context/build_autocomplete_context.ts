/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import { isScalar } from 'yaml';
import type { monaco } from '@kbn/monaco';
import type { WorkflowYaml } from '@kbn/workflows';
import { DynamicStepContextSchema } from '@kbn/workflows';
import { getPathAtOffset } from '@kbn/workflows/common/utils/yaml';
import { getSchemaAtPath } from '@kbn/workflows/common/utils/zod/get_schema_at_path';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import type { LineParseResult } from '@kbn/workflows-yaml';
import { parseLineForCompletion } from '@kbn/workflows-yaml';
import type { z } from '@kbn/zod/v4';
import type { AutocompleteContext } from './autocomplete.types';
import { getFocusedYamlPair } from './get_focused_yaml_pair';
import { isInsideLiquidBlock } from './liquid_utils';
import {
  getTriggerConditionBlockIndex,
  isInScheduledTriggerWithBlock,
  isInStepsContext,
  isInTriggersContext,
  isInWorkflowInputsByPosition,
  isInWorkflowInputsPath,
} from './triggers_utils';
import type { StepInfo, WorkflowDetailState } from '../../../../../entities/workflows/store';
import { getContextSchemaForPath } from '../../../../../features/workflow_context/lib/get_context_for_path';
import {
  type EsqlStepRegion,
  findEsqlStepRegionsFromText,
} from '../../esql_validation/find_esql_step_regions';
import { getRegisteredTriggerConditionDefinition } from '../get_registered_trigger_condition_definition';

function buildCompletionInsertRange(
  completionContext: monaco.languages.CompletionContext,
  lineNumber: number,
  position: monaco.Position,
  word: monaco.editor.IWordAtPosition
): monaco.IRange {
  if (completionContext.triggerCharacter === ' ') {
    return {
      startLineNumber: lineNumber,
      endLineNumber: lineNumber,
      startColumn: position.column,
      endColumn: position.column,
    };
  }
  return {
    startLineNumber: lineNumber,
    endLineNumber: lineNumber,
    startColumn: word.startColumn,
    endColumn: word.endColumn,
  };
}

function resolveContextSchemaForAutocomplete(
  workflowDefinition: WorkflowYaml | null | undefined,
  workflowGraph: WorkflowGraph | null | undefined,
  path: (string | number)[],
  yamlDocument: Document,
  absoluteOffset: number,
  lineParseResult: LineParseResult | null
): { contextSchema: z.ZodType; contextScopedToPath: string | null } {
  let contextSchema: z.ZodType = DynamicStepContextSchema;
  let contextScopedToPath: string | null = null;

  if (workflowDefinition && workflowGraph) {
    contextSchema = getContextSchemaForPath(
      workflowDefinition,
      workflowGraph,
      path,
      yamlDocument,
      absoluteOffset
    );
  }

  if (lineParseResult?.fullKey) {
    const { schema: schemaAtPath, scopedToPath } = getSchemaAtPath(
      contextSchema,
      lineParseResult.fullKey,
      { partial: true }
    );
    if (schemaAtPath) {
      contextSchema = schemaAtPath;
      contextScopedToPath = scopedToPath;
    }
  }

  return { contextSchema, contextScopedToPath };
}

function resolveTriggerConditionAutocomplete(
  path: (string | number)[],
  yamlDocument: Document
): Pick<AutocompleteContext, 'isInTriggerConditionField' | 'triggerConditionDefinition'> {
  const triggerConditionBlockIndex = getTriggerConditionBlockIndex(path);
  return {
    isInTriggerConditionField: triggerConditionBlockIndex !== null,
    triggerConditionDefinition: getRegisteredTriggerConditionDefinition(yamlDocument, path),
  };
}

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
  const workflows = editorState?.workflows;
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

  const focusedStepInfo: StepInfo | null = focusedStepId
    ? workflowLookup?.steps[focusedStepId] ?? null
    : null;
  const focusedYamlPair = getFocusedYamlPair(workflowLookup, focusedStepId, absoluteOffset);

  if (!yamlDocument) {
    return null;
  }

  const range = buildCompletionInsertRange(completionContext, lineNumber, position, word);

  const path = getPathAtOffset(yamlDocument, absoluteOffset);
  const yamlNode = yamlDocument.getIn(path, true);
  const scalarType = isScalar(yamlNode) ? yamlNode.type ?? null : null;

  const lineUpToCursor = line.substring(0, position.column - 1);
  const parseResult = parseLineForCompletion(lineUpToCursor);

  const { contextSchema, contextScopedToPath } = resolveContextSchemaForAutocomplete(
    workflowDefinition,
    workflowGraph,
    path,
    yamlDocument,
    absoluteOffset,
    parseResult
  );

  // Check if we're actually inside a liquid block
  const isInLiquidBlock = isInsideLiquidBlock(model.getValue(), position);
  const _isInScheduledTriggerWithBlock = isInScheduledTriggerWithBlock(
    yamlDocument,
    absoluteOffset
  );

  const { isInTriggerConditionField, triggerConditionDefinition } =
    resolveTriggerConditionAutocomplete(path, yamlDocument);

  const esqlRegion = findEsqlRegionContainingCursor(model.getValue(), absoluteOffset);
  const esqlOffsetInQuery =
    esqlRegion !== null ? absoluteOffset - esqlRegion.contentStartInFile : null;

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
    isInTriggerConditionField,
    triggerConditionDefinition,
    isInScheduledTriggerWithBlock: _isInScheduledTriggerWithBlock,
    isInTriggersContext: isInTriggersContext(path),
    isInStepsContext: isInStepsContext(path),
    isInWorkflowInputsContext:
      isInWorkflowInputsPath(path) || isInWorkflowInputsByPosition(focusedStepInfo, absoluteOffset),
    isInEsqlQueryField: esqlRegion !== null,
    esqlRegion,
    esqlOffsetInQuery,

    // dynamic connector types
    dynamicConnectorTypes: currentDynamicConnectorTypes ?? null,
    workflows: workflows ?? {
      workflows: {},
      totalWorkflows: 0,
    },
    currentWorkflowId: editorState?.workflow?.id ?? null,
    workflowDefinition: workflowDefinition ?? null,
  };
}

/**
 * Returns the `elasticsearch.esql.query` step region containing the cursor,
 * or `null` if the cursor is outside any.
 *
 * The redux store's yamlDocument is recomputed on a 500ms debounce, but
 * completion runs on every keystroke — the cached document doesn't include
 * the character the user just typed. Re-parse from the current model text
 * here so region offsets always reflect what's on screen. The cheap text
 * guard keeps the YAML parse off the path for workflows without an ES|QL
 * step (the common case).
 */
function findEsqlRegionContainingCursor(
  modelText: string,
  absoluteOffset: number
): EsqlStepRegion | null {
  if (!modelText.includes('elasticsearch.esql.query')) {
    return null;
  }
  for (const region of findEsqlStepRegionsFromText(modelText)) {
    if (cursorBelongsToRegion(absoluteOffset, region, modelText)) {
      return region;
    }
  }
  return null;
}

/**
 * `findEsqlStepRegions` trims trailing whitespace off `contentEndInFile` so the
 * validator's diagnostics never point at hanging spaces. Completion needs the
 * opposite: when the user is typing past the last non-whitespace character of
 * the query body (e.g. `FROM logs-* | <cursor>`), the cursor is one or more
 * spaces past `contentEndInFile` but still inside the editable scalar. Treat
 * those positions as in-region as long as everything between
 * `contentEndInFile` and the cursor is intra-line whitespace (space or tab).
 */
function cursorBelongsToRegion(
  absoluteOffset: number,
  region: EsqlStepRegion,
  modelText: string
): boolean {
  if (absoluteOffset < region.contentStartInFile) {
    return false;
  }
  if (absoluteOffset <= region.contentEndInFile) {
    return true;
  }
  for (let i = region.contentEndInFile; i < absoluteOffset; i++) {
    const ch = modelText.charCodeAt(i);
    // 0x20 space, 0x09 tab. A newline closes the scalar's last line, so we stop.
    if (ch !== 0x20 && ch !== 0x09) {
      return false;
    }
  }
  return true;
}
