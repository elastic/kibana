/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface ConnectorIdItem {
  id: string;
  connectorType: string;
  type: 'connector-id';
  key: string | null;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  yamlPath: (string | number)[];
}

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
  node: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export interface WorkflowInputsItem {
  id: string;
  workflowId: string | null;
  inputs: Record<string, unknown> | undefined;
  inputsNode: import('yaml').YAMLMap | null;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  yamlPath: (string | number)[];
}

export type YamlValidationErrorSeverity = 'error' | 'warning' | 'info';

interface YamlValidationResultBase {
  id: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  hoverMessage: string | null;
  afterMessage?: string | null;
  source?: string; // the source of the marker, details e.g. yaml schema uri
}

interface YamlValidationResultNonUniqueStepName extends YamlValidationResultBase {
  severity: YamlValidationErrorSeverity;
  message: string;
  owner: 'step-name-validation';
}

interface YamlValidationResultVariableError extends YamlValidationResultBase {
  severity: YamlValidationErrorSeverity;
  message: string;
  owner: 'variable-validation';
}

// null means that the result is not an error
interface YamlValidationResultVariableValid extends YamlValidationResultBase {
  severity: null;
  message: null;
  owner: 'variable-validation';
}

interface YamlValidationResultMonacoYaml extends YamlValidationResultBase {
  severity: YamlValidationErrorSeverity;
  message: string;
  owner: 'yaml';
  hoverMessage: null;
}

interface YamlValidationResultLiquidTemplate extends YamlValidationResultBase {
  severity: YamlValidationErrorSeverity;
  message: string;
  owner: 'liquid-template-validation';
}
interface YamlValidationResultConnectorIdValid extends YamlValidationResultBase {
  severity: null;
  message: null;
  owner: 'connector-id-validation';
}

interface YamlValidationResultConnectorIdError extends YamlValidationResultBase {
  severity: YamlValidationErrorSeverity;
  message: string;
  owner: 'connector-id-validation';
}

interface YamlValidationResultWorkflowInputsError extends YamlValidationResultBase {
  severity: YamlValidationErrorSeverity;
  message: string;
  owner: 'workflow-inputs-validation';
}

interface YamlValidationResultWorkflowOutputsError extends YamlValidationResultBase {
  severity: YamlValidationErrorSeverity;
  message: string;
  owner: 'workflow-output-validation';
}

export function isYamlValidationMarkerOwner(owner: string): owner is YamlValidationResult['owner'] {
  return [
    'step-name-validation',
    'variable-validation',
    'liquid-template-validation',
    'yaml',
    'connector-id-validation',
    'workflow-inputs-validation',
    'workflow-output-validation',
  ].includes(owner);
}

export type YamlValidationResult =
  | YamlValidationResultNonUniqueStepName
  | YamlValidationResultVariableError
  | YamlValidationResultVariableValid
  | YamlValidationResultMonacoYaml
  | YamlValidationResultLiquidTemplate
  | YamlValidationResultConnectorIdError
  | YamlValidationResultConnectorIdValid
  | YamlValidationResultWorkflowInputsError
  | YamlValidationResultWorkflowOutputsError;
