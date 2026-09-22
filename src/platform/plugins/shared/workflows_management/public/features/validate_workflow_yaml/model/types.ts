/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PropertySelectionHandler,
  SelectionContext,
  WorkflowValidationRuleId,
} from '@kbn/workflows';

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
  /** Never null: the regex `key` group always participates in a match. */
  key: string;
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

interface YamlValidationDiagnosticBase extends YamlValidationResultBase {
  /** Stable identity of the check that produced this diagnostic. */
  ruleId: WorkflowValidationRuleId;
  severity: YamlValidationErrorSeverity;
  message: string;
}

interface YamlValidationDecorationBase extends YamlValidationResultBase {
  ruleId?: never;
  severity: 'info' | null;
  message: null;
}

interface YamlValidationResultNonUniqueStepName extends YamlValidationDiagnosticBase {
  owner: 'step-name-validation';
}

interface YamlValidationResultVariableError extends YamlValidationDiagnosticBase {
  owner: 'variable-validation';
}

// null means that the result is not an error
interface YamlValidationResultVariableValid extends YamlValidationDecorationBase {
  owner: 'variable-validation';
}
interface YamlValidationResultMonacoYaml extends YamlValidationDiagnosticBase {
  owner: 'yaml';
  hoverMessage: null;
}

interface YamlValidationResultLiquidTemplate extends YamlValidationDiagnosticBase {
  owner: 'liquid-template-validation';
}
interface YamlValidationResultConnectorIdValid extends YamlValidationDecorationBase {
  severity: 'info';
  owner: 'connector-id-validation';
}

interface YamlValidationResultConnectorIdError extends YamlValidationDiagnosticBase {
  owner: 'connector-id-validation';
}

interface YamlValidationResultJsonSchemaDefault extends YamlValidationDiagnosticBase {
  owner: 'json-schema-default-validation';
}

interface YamlValidationResultStepPropertyError extends YamlValidationDiagnosticBase {
  owner: 'step-property-validation';
}

interface YamlValidationResultStepPropertyValid extends YamlValidationDecorationBase {
  severity: null;
  owner: 'step-property-validation';
}

interface YamlValidationResultTriggerConditionError extends YamlValidationDiagnosticBase {
  owner: 'trigger-condition-validation';
}

interface YamlValidationResultWorkflowOutput extends YamlValidationDiagnosticBase {
  owner: 'workflow-output-validation';
}

interface YamlValidationResultIfConditionError extends YamlValidationDiagnosticBase {
  owner: 'if-condition-validation';
}

interface YamlValidationResultDeprecatedStep extends YamlValidationDiagnosticBase {
  owner: 'deprecated-step-validation';
}

interface YamlValidationResultEsql extends YamlValidationDiagnosticBase {
  owner: 'esql-validation';
}

interface YamlValidationResultParallelFanOut extends YamlValidationDiagnosticBase {
  owner: 'parallel-fan-out-validation';
}

interface YamlValidationResultParallelMode extends YamlValidationDiagnosticBase {
  owner: 'parallel-mode-validation';
}

interface YamlValidationResultGraphBuild extends YamlValidationDiagnosticBase {
  owner: 'graph-build-validation';
}

export type StepPropertyValidationResult =
  | YamlValidationResultStepPropertyError
  | YamlValidationResultStepPropertyValid;

interface YamlValidationResultWorkflowInputsError extends YamlValidationDiagnosticBase {
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
  'esql-validation',
  'parallel-fan-out-validation',
  'parallel-mode-validation',
  'graph-build-validation',
] as const;

export const BATCHED_CUSTOM_MARKER_OWNER = 'custom-yaml-validation';

export function isYamlValidationMarkerOwner(owner: string): owner is YamlValidationResult['owner'] {
  return (
    [...CUSTOM_YAML_VALIDATION_MARKER_OWNERS, 'yaml'].includes(
      owner as YamlValidationResult['owner']
    ) || owner === BATCHED_CUSTOM_MARKER_OWNER
  );
}

export type YamlValidationDiagnostic =
  | YamlValidationResultNonUniqueStepName
  | YamlValidationResultVariableError
  | YamlValidationResultMonacoYaml
  | YamlValidationResultLiquidTemplate
  | YamlValidationResultConnectorIdError
  | YamlValidationResultJsonSchemaDefault
  | YamlValidationResultStepPropertyError
  | YamlValidationResultWorkflowInputsError
  | YamlValidationResultTriggerConditionError
  | YamlValidationResultWorkflowOutput
  | YamlValidationResultIfConditionError
  | YamlValidationResultDeprecatedStep
  | YamlValidationResultEsql
  | YamlValidationResultParallelFanOut
  | YamlValidationResultParallelMode
  | YamlValidationResultGraphBuild;

export type YamlValidationDecoration =
  | YamlValidationResultVariableValid
  | YamlValidationResultConnectorIdValid
  | YamlValidationResultStepPropertyValid;

export type YamlValidationResult = YamlValidationDiagnostic | YamlValidationDecoration;

export function validationResultFingerprint(r: YamlValidationResult): string {
  return `${r.owner}\0${r.ruleId ?? ''}\0${r.severity}\0${r.startLineNumber}:${r.startColumn}\0${
    r.endLineNumber
  }:${r.endColumn}\0${r.message}`;
}

export function validationResultsFingerprint(results: YamlValidationResult[]): string {
  return results.map(validationResultFingerprint).sort().join('\n');
}

export function filterHighlightableValidationResults(
  validationResults: YamlValidationResult[]
): YamlValidationDiagnostic[] {
  return validationResults.filter(
    (result): result is YamlValidationDiagnostic =>
      result.severity === 'error' || result.severity === 'warning'
  );
}
