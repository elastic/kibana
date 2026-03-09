/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import type { monaco } from '@kbn/monaco';
import { getStepNodesWithType } from '../../../common/lib/yaml';
import { getIndentLevelFromLineNumber } from '../../widgets/workflow_yaml_editor/lib/get_indent_level';
import { getMonacoRangeFromYamlNode } from '../../widgets/workflow_yaml_editor/lib/utils';

export interface StepRange {
  startLine: number;
  endLine: number;
  indentLevel: number;
}

export function findStepRange(
  yamlDocument: Document,
  model: monaco.editor.ITextModel,
  stepName: string
): StepRange | null {
  const stepNodes = getStepNodesWithType(yamlDocument);
  const stepNode = stepNodes.find((node) => node.get('name') === stepName);
  if (!stepNode) return null;

  const range = getMonacoRangeFromYamlNode(model, stepNode);
  if (!range) return null;

  return {
    startLine: range.startLineNumber,
    endLine: range.endLineNumber,
    indentLevel: getIndentLevelFromLineNumber(model, range.startLineNumber),
  };
}

export function findInsertLineAfterLastStep(
  yamlDocument: Document,
  model: monaco.editor.ITextModel
): { lineNumber: number; indentLevel: number } {
  const stepNodes = getStepNodesWithType(yamlDocument);

  if (stepNodes.length === 0) {
    return { lineNumber: model.getLineCount() + 1, indentLevel: 2 };
  }

  const lastStep = stepNodes[stepNodes.length - 1];
  const lastStepRange = getMonacoRangeFromYamlNode(model, lastStep);

  if (!lastStepRange) {
    return { lineNumber: model.getLineCount() + 1, indentLevel: 2 };
  }

  return {
    lineNumber: lastStepRange.endLineNumber + 1,
    indentLevel: getIndentLevelFromLineNumber(model, lastStepRange.startLineNumber),
  };
}
