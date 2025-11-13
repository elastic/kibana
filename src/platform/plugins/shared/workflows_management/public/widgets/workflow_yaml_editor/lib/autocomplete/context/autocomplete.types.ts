/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document, Scalar } from 'yaml';
import type { monaco } from '@kbn/monaco';
import type { ConnectorTypeInfo } from '@kbn/workflows';
import type { z } from '@kbn/zod';
import type { LineParseResult } from './parse_line_for_completion';
import type {
  StepInfo,
  StepPropInfo,
} from '../../../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';

// TODO: see if we can reduce the number of properties in this interface and group them into smaller interfaces
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
  scalarType: Scalar.Type | null;

  // kind of ast info
  isInLiquidBlock: boolean;
  isInTriggersContext: boolean;
  isInScheduledTriggerWithBlock: boolean;
  isInStepsContext: boolean;

  // dynamic connector types
  dynamicConnectorTypes: Record<string, ConnectorTypeInfo> | null;
}

// we don't want to pass model and position, but currently it's used in getWithBlockSuggestions
// TODO: refactor this to not pass model and position
export interface ExtendedAutocompleteContext extends AutocompleteContext {
  model: monaco.editor.ITextModel;
  position: monaco.Position;
}
