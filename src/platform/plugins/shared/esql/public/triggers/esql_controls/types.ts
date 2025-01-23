/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLVariableType } from '@kbn/esql-validation-autocomplete';

export enum EsqlControlType {
  STATIC_VALUES = 'STATIC_VALUES',
  VALUES_FROM_QUERY = 'VALUES_FROM_QUERY',
}

export type ControlWidthOptions = 'small' | 'medium' | 'large';

export interface ESQLControlState {
  grow?: boolean;
  width?: ControlWidthOptions;
  title: string;
  availableOptions: string[];
  selectedOptions: string[];
  variableName: string;
  variableType: ESQLVariableType;
  esqlQuery: string;
  controlType: EsqlControlType;
}
