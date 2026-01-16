/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PropertyValidationFn } from '@kbn/workflows';

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
}

export interface CustomPropertyItem extends BaseItem {
  type: 'custom-property';
  scope: 'config' | 'input';
  stepType: string;
  propertyKey: string;
  propertyValue: unknown;
  validator: PropertyValidationFn;
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
  severity: null;
  message: null;
  owner: 'connector-id-validation';
}

interface YamlValidationResultConnectorIdError extends YamlValidationResultBase {
  severity: YamlValidationErrorSeverity;
  message: string;
  owner: 'connector-id-validation';
}

interface YamlValidationResultCustomPropertyError extends YamlValidationResultBase {
  severity: YamlValidationErrorSeverity;
  message: string;
  owner: 'custom-property-validation';
}

interface YamlValidationResultCustomPropertyValid extends YamlValidationResultBase {
  severity: null;
  message: null;
  owner: 'custom-property-validation';
}

export type CustomPropertyValidationResult =
  | YamlValidationResultCustomPropertyError
  | YamlValidationResultCustomPropertyValid;

export const CUSTOM_YAML_VALIDATION_MARKER_OWNERS = [
  'step-name-validation',
  'variable-validation',
  'liquid-template-validation',
  'connector-id-validation',
  'custom-property-validation',
] as const;

export function isYamlValidationMarkerOwner(owner: string): owner is YamlValidationResult['owner'] {
  return [...CUSTOM_YAML_VALIDATION_MARKER_OWNERS, 'yaml'].includes(
    owner as YamlValidationResult['owner']
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
  | YamlValidationResultCustomPropertyError
  | YamlValidationResultCustomPropertyValid;
