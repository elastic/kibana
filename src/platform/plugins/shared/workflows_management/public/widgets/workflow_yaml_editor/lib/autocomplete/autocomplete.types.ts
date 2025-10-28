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
import type { StepInfo } from '../store/utils/build_workflow_lookup';

export interface AutocompleteContext {
  triggerCharacter: string | null;
  triggerKind: monaco.languages.CompletionTriggerKind | null;
  line: string;
  lineUpToCursor: string;
  lineParseResult: LineParseResult | null;
  lastPathSegment: string | null;
  contextSchema: z.ZodType;
  focusedStepInfo: StepInfo | null;
  connectorType: string | null;
  yamlDocument: Document;
  scalarType: Scalar.Type | null;
  path: (string | number)[];
  range: monaco.IRange;
  absolutePosition: number;
  dynamicConnectorTypes: Record<string, ConnectorTypeInfo> | null;
  isInLiquidBlock: boolean;
  shouldUseCurlyBraces: boolean;
  shouldBeQuoted: boolean;
  model: monaco.editor.ITextModel;
  position: monaco.Position;
}
