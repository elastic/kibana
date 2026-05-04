/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PropertySelectionHandler, SelectionContext } from '@kbn/workflows';

interface BaseItem {
  id: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  yamlPath: (string | number)[];
  key: string | null;
}

export interface ConnectorIdItem extends BaseItem {
  connectorType: string;
  type: 'connector-id';
}

export interface VariableItem extends BaseItem {
  type: 'regexp' | 'foreach';
  offset?: number;
}

export interface StepPropertyItem extends BaseItem {
  type: 'step-property';
  /** Stable step instance id from the workflow lookup (used for validation-outcome caching). */
  stepId: string;
  scope: 'config' | 'input';
  stepType: string;
  propertyKey: string;
  propertyValue: unknown;
  selectionHandler: PropertySelectionHandler;
  context: SelectionContext;
}

export interface StepNameInfo {
  name: string;
  node: any; // eslint-disable-line @typescript-eslint/no-explicit-any
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
  afterMessage?: string | null;
  beforeMessage?: string | null;
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
  severity: YamlValidationErrorSeverity;
  message: string | null;
  owner: 'connector-id-validation';
}

interface YamlValidationResultConnectorIdError extends YamlValidationResultBase {
  severity: YamlValidationErrorSeverity;
  message: string;
  owner: 'connector-id-validation';
}

interface YamlValidationResultJsonSchemaDefault extends YamlValidationResultBase {
  severity: YamlValidationErrorSeverity;
  message: string;
  owner: 'json-schema-default-validation';
}

interface YamlValidationResultStepPropertyError extends YamlValidationResultBase {
  severity: YamlValidationErrorSeverity;
  message: string;
  owner: 'step-property-validation';
}

interface YamlValidationResultStepPropertyValid extends YamlValidationResultBase {
  severity: null;
  message: null;
  owner: 'step-property-validation';
}

interface YamlValidationResultTriggerConditionError extends YamlValidationResultBase {
  severity: YamlValidationErrorSeverity;
  message: string;
  owner: 'trigger-condition-validation';
}

interface YamlValidationResultWorkflowOutput extends YamlValidationResultBase {
  severity: YamlValidationErrorSeverity;
  message: string;
  owner: 'workflow-output-validation';
}

interface YamlValidationResultIfConditionError extends YamlValidationResultBase {
  severity: YamlValidationErrorSeverity;
  message: string;
  owner: 'if-condition-validation';
}

interface YamlValidationResultDeprecatedStep extends YamlValidationResultBase {
  severity: YamlValidationErrorSeverity;
  message: string;
  owner: 'deprecated-step-validation';
}

export type StepPropertyValidationResult =
  | YamlValidationResultStepPropertyError
  | YamlValidationResultStepPropertyValid;

interface YamlValidationResultWorkflowInputsError extends YamlValidationResultBase {
  severity: YamlValidationErrorSeverity;
  message: string;
  owner: 'workflow-inputs-validation';
}

export const CUSTOM_YAML_VALIDATION_MARKER_OWNERS = [
  'step-name-validation',
  'variable-validation',
  'liquid-template-validation',
  'connector-id-validation',
  'json-schema-default-validation',
  'step-property-validation',
  'workflow-inputs-validation',
  'trigger-condition-validation',
  'workflow-output-validation',
  'if-condition-validation',
  'deprecated-step-validation',
] as const;

export const BATCHED_CUSTOM_MARKER_OWNER = 'custom-yaml-validation';

export function isYamlValidationMarkerOwner(owner: string): owner is YamlValidationResult['owner'] {
  return (
    [...CUSTOM_YAML_VALIDATION_MARKER_OWNERS, 'yaml'].includes(
      owner as YamlValidationResult['owner']
    ) || owner === BATCHED_CUSTOM_MARKER_OWNER
  );
}

export type YamlValidationResult =
  | YamlValidationResultNonUniqueStepName
  | YamlValidationResultVariableError
  | YamlValidationResultVariableValid
  | YamlValidationResultMonacoYaml
  | YamlValidationResultLiquidTemplate
  | YamlValidationResultConnectorIdError
  | YamlValidationResultConnectorIdValid
  | YamlValidationResultJsonSchemaDefault
  | YamlValidationResultStepPropertyError
  | YamlValidationResultStepPropertyValid
  | YamlValidationResultWorkflowInputsError
  | YamlValidationResultTriggerConditionError
  | YamlValidationResultWorkflowOutput
  | YamlValidationResultIfConditionError
  | YamlValidationResultDeprecatedStep;

export function validationResultFingerprint(r: YamlValidationResult): string {
  return `${r.owner}\0${r.severity}\0${r.startLineNumber}:${r.startColumn}\0${r.endLineNumber}:${r.endColumn}\0${r.message}`;
}
