/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  FunctionDefinition,
  FunctionParameter,
  Signature,
  SupportedDataType,
} from '../../types';

export interface SignatureState {
  signatures: Signature[];
  paramDefinitions: FunctionParameter[];
  firstArgumentType?: string;
  firstValueType?: string;
  currentParameterIndex: number;
  hasMoreMandatoryArgs: boolean;
}

export interface FunctionParameterContext {
  paramDefinitions: FunctionParameter[];
  hasMoreMandatoryArgs?: boolean;
  functionDefinition?: FunctionDefinition;
  firstArgumentType?: SupportedDataType | 'unknown';
  firstValueType?: SupportedDataType | 'unknown';
  currentParameterIndex?: number;
  validSignatures?: Signature[];
}
