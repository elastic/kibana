/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import {
  WorkflowYAMLEditorDiffProps,
  WorkflowYAMLEditorProps,
  YamlValidationErrorSeverity,
} from '../model/types';

// Copied from monaco-editor/esm/vs/editor/editor.api.d.ts because we can't import with turbopack
export enum MarkerSeverity {
  Hint = 1,
  Info = 2,
  Warning = 4,
  Error = 8,
}

export function getSeverityString(severity: MarkerSeverity): YamlValidationErrorSeverity {
  switch (severity) {
    case MarkerSeverity.Error:
      return 'error';
    case MarkerSeverity.Warning:
      return 'warning';
    case MarkerSeverity.Info:
    case MarkerSeverity.Hint:
    default:
      return 'info';
  }
}

export function isDiffEditorProps(
  props: WorkflowYAMLEditorProps
): props is WorkflowYAMLEditorDiffProps {
  return 'original' in props && 'modified' in props;
}

export function navigateToErrorPosition(
  editor: monaco.editor.IStandaloneCodeEditor | monaco.editor.IDiffEditor,
  lineNumber: number,
  column: number
): void {
  editor.setPosition({
    lineNumber,
    column,
  });
  editor.focus();
  editor.revealLineInCenter(lineNumber);
}
