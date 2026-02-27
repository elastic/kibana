/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import { monaco } from '@kbn/monaco';
import { getStepNodesWithType } from '../../../common/lib/yaml';
import { getIndentLevelFromLineNumber } from '../../widgets/workflow_yaml_editor/lib/get_indent_level';
import { prependIndentToLines } from '../../widgets/workflow_yaml_editor/lib/prepend_indent_to_lines';
import { getMonacoRangeFromYamlNode } from '../../widgets/workflow_yaml_editor/lib/utils';

export interface PerformMonacoEditOptions {
  scrollToEdit?: boolean;
  highlightEdit?: boolean;
}

/**
 * Performs an edit operation on the Monaco model with proper undo boundaries.
 * This is the core function that gives us Cursor-like editing UX.
 */
export function performMonacoEdit(
  editor: monaco.editor.IStandaloneCodeEditor,
  edits: monaco.editor.IIdentifiedSingleEditOperation[],
  options?: PerformMonacoEditOptions
): void {
  const model = editor.getModel();
  if (!model) return;

  // Create undo boundary before edit
  editor.pushUndoStop();

  // Perform the actual edit(s)
  model.pushEditOperations(null, edits, () => null);

  // Create undo boundary after edit
  editor.pushUndoStop();

  // Optionally scroll to the edit location
  if (options?.scrollToEdit && edits.length > 0) {
    editor.revealLineInCenter(edits[0].range.startLineNumber);
  }
}

/**
 * Insert text at a specific line number with optional indentation
 */
export function insertAtLine(
  editor: monaco.editor.IStandaloneCodeEditor,
  lineNumber: number,
  text: string,
  indent: number = 0
): void {
  const indentedText = indent > 0 ? prependIndentToLines(text, indent) : text;
  // Ensure text ends with newline for proper insertion
  const textWithNewline = indentedText.endsWith('\n') ? indentedText : `${indentedText}\n`;

  performMonacoEdit(
    editor,
    [
      {
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        text: textWithNewline,
      },
    ],
    { scrollToEdit: true }
  );
}

/**
 * Replace a range of lines (e.g., replace a step)
 */
export function replaceRange(
  editor: monaco.editor.IStandaloneCodeEditor,
  startLine: number,
  endLine: number,
  newText: string
): void {
  const model = editor.getModel();
  if (!model) return;

  const endColumn = model.getLineMaxColumn(endLine);
  performMonacoEdit(
    editor,
    [
      {
        range: new monaco.Range(startLine, 1, endLine, endColumn),
        text: newText,
      },
    ],
    { scrollToEdit: true }
  );
}

/**
 * Delete a range of lines
 */
export function deleteRange(
  editor: monaco.editor.IStandaloneCodeEditor,
  startLine: number,
  endLine: number
): void {
  const model = editor.getModel();
  if (!model) return;

  // Delete including the newline to avoid leaving empty lines
  const endLineMax = model.getLineCount();
  const endColumn = endLine < endLineMax ? 1 : model.getLineMaxColumn(endLine);
  const actualEndLine = endLine < endLineMax ? endLine + 1 : endLine;

  performMonacoEdit(
    editor,
    [
      {
        range: new monaco.Range(startLine, 1, actualEndLine, endColumn),
        text: '',
      },
    ],
    { scrollToEdit: false }
  );
}

export interface StepRange {
  startLine: number;
  endLine: number;
  indentLevel: number;
}

/**
 * Find a step by name in the YAML and return its line range
 */
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

/**
 * Find the last step in the workflow and return the line number after it
 */
export function findInsertLineAfterLastStep(
  yamlDocument: Document,
  model: monaco.editor.ITextModel
): { lineNumber: number; indentLevel: number } {
  const stepNodes = getStepNodesWithType(yamlDocument);

  if (stepNodes.length === 0) {
    // No steps found, return end of file
    return {
      lineNumber: model.getLineCount() + 1,
      indentLevel: 2, // Default indent for steps
    };
  }

  const lastStep = stepNodes[stepNodes.length - 1];
  const lastStepRange = getMonacoRangeFromYamlNode(model, lastStep);

  if (!lastStepRange) {
    return {
      lineNumber: model.getLineCount() + 1,
      indentLevel: 2,
    };
  }

  return {
    lineNumber: lastStepRange.endLineNumber + 1,
    indentLevel: getIndentLevelFromLineNumber(model, lastStepRange.startLineNumber),
  };
}
