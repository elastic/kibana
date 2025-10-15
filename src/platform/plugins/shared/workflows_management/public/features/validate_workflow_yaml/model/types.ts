/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface VariableItem {
  id: string;
  type: 'regexp' | 'foreach';
  key: string | null;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  yamlPath: (string | number)[];
}

export interface StepNameInfo {
  name: string;
  node: any;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export type YamlValidationErrorSeverity = 'error' | 'warning' | 'info';

interface YamlValidationResultBase {
  id: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  hoverMessage: string | null;
}

interface YamlValidationResultNonUniqueStepName extends YamlValidationResultBase {
  severity: YamlValidationErrorSeverity;
  message: string;
  source: 'step-name-validation';
}

interface YamlValidationResultVariableError extends YamlValidationResultBase {
  severity: YamlValidationErrorSeverity;
  message: string;
  source: 'variable-validation';
}

// null means that the result is not an error
interface YamlValidationResultVariableValid extends YamlValidationResultBase {
  severity: null;
  message: null;
  source: 'variable-validation';
}

interface YamlValidationResultMonacoYaml extends YamlValidationResultBase {
  severity: YamlValidationErrorSeverity;
  message: string;
  source: 'monaco-yaml';
  hoverMessage: null;
}

export type YamlValidationResult =
  | YamlValidationResultNonUniqueStepName
  | YamlValidationResultVariableError
  | YamlValidationResultVariableValid
  | YamlValidationResultMonacoYaml;
