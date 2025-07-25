/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';

export type YamlValidationErrorSeverity = 'error' | 'warning' | 'info';

export interface YamlValidationError {
  message: string;
  severity: YamlValidationErrorSeverity;
  lineNumber: number;
  column: number;
  owner: string;
}

export interface BaseWorkflowYAMLEditorProps {
  workflowId?: string;
  filename?: string;
  readOnly?: boolean;
  'data-testid'?: string;
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => void;
  onChange?: (value: string | undefined) => void;
  onValidationErrors?: React.Dispatch<React.SetStateAction<YamlValidationError[]>>;
  onSave?: (value: string) => void;
}

export type WorkflowYAMLEditorDefaultProps = BaseWorkflowYAMLEditorProps & {
  value: string;
};

export type WorkflowYAMLEditorDiffProps = BaseWorkflowYAMLEditorProps & {
  original: string;
  modified: string;
};

export type WorkflowYAMLEditorProps = WorkflowYAMLEditorDefaultProps | WorkflowYAMLEditorDiffProps;
