/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document, LineCounter, Scalar } from 'yaml';
import type { monaco } from '@kbn/monaco';
import type { ConnectorTypeInfo, WorkflowYaml } from '@kbn/workflows';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import type { z } from '@kbn/zod/v4';
import type { LineParseResult } from './parse_line_for_completion';
import type { WorkflowsResponse } from '../../../../../entities/workflows/model/types';
import type {
  StepInfo,
  StepPropInfo,
} from '../../../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';

export interface AutocompleteContext {
  // what triggered the completion
  triggerCharacter: string | null;
  triggerKind: monaco.languages.CompletionTriggerKind | null;

  // content
  line: string;
  lineUpToCursor: string;
  lineParseResult: LineParseResult | null;

  // position of the cursor
  path: (string | number)[];
  range: monaco.IRange;
  absoluteOffset: number;
  focusedStepInfo: StepInfo | null;
  focusedYamlPair: StepPropInfo | null;

  // context
  contextSchema: z.ZodType;
  contextScopedToPath: string | null;
  yamlDocument: Document;
  yamlLineCounter: LineCounter | null;
  scalarType: Scalar.Type | null;

  // kind of ast info
  isInLiquidBlock: boolean;
  /** True when the cursor is in the scalar value for `triggers[i].on.condition`. */
  isInTriggerConditionField: boolean;
  /**
   * When the cursor is in `on.condition` and `triggers[i].type` matches a trigger registered
   * in workflows extensions, the public definition. Undefined for built-in types, unregistered
   * ids, or missing `type` in YAML.
   */
  triggerConditionDefinition: PublicTriggerDefinition | undefined;
  isInTriggersContext: boolean;
  isInScheduledTriggerWithBlock: boolean;
  isInStepsContext: boolean;
  isInWorkflowInputsContext: boolean;

  // dynamic connector types
  dynamicConnectorTypes: Record<string, ConnectorTypeInfo> | null;
  workflows: WorkflowsResponse;
  currentWorkflowId: string | null;
  workflowDefinition: WorkflowYaml | null;
}

// Extended context includes Monaco editor model and position for advanced autocompletion features
export interface ExtendedAutocompleteContext extends AutocompleteContext {
  model: monaco.editor.ITextModel;
  position: monaco.Position;
}
