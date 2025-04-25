/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLMessage, ESQLLocation } from '@kbn/esql-ast';
import { FieldType, SupportedDataType } from '../definitions/types';
import type { EditorError } from '../types';

export interface ESQLUserDefinedColumn {
  name: string;
  // invalid expressions produce columns of type "unknown"
  // also, there are some cases where we can't yet infer the type of
  // a valid expression as with `CASE` which can return union types
  type: SupportedDataType | 'unknown';
  location: ESQLLocation;
}

export interface ESQLRealField {
  name: string;
  type: FieldType;
  isEcs?: boolean;
  hasConflict?: boolean;
  metadata?: {
    description?: string;
  };
}

export interface ESQLPolicy {
  name: string;
  sourceIndices: string[];
  matchField: string;
  enrichFields: string[];
}

export interface ReferenceMaps {
  sources: Set<string>;
  userDefinedColumns: Map<string, ESQLUserDefinedColumn[]>;
  fields: Map<string, ESQLRealField>;
  policies: Map<string, ESQLPolicy>;
  query: string;
  joinIndices: JoinIndexAutocompleteItem[];
}

export interface JoinIndexAutocompleteItem {
  name: string;
  mode: 'lookup' | string;
  aliases: string[];
}

export interface ValidationErrors {
  wrongArgumentType: {
    message: string;
    type: {
      name: string;
      argType: string;
      value: string | number | Date;
      givenType: string;
    };
  };
  wrongArgumentNumber: {
    message: string;
    type: {
      fn: string;
      numArgs: number;
      passedArgs: number;
    };
  };
  wrongArgumentNumberTooMany: {
    message: string;
    type: {
      fn: string;
      numArgs: number;
      passedArgs: number;
      extraArgs: number;
    };
  };
  wrongArgumentNumberTooFew: {
    message: string;
    type: {
      fn: string;
      numArgs: number;
      passedArgs: number;
      missingArgs: number;
    };
  };
  unknownColumn: {
    message: string;
    type: { name: string | number };
  };
  unknownFunction: {
    message: string;
    type: { name: string };
  };
  unknownIndex: {
    message: string;
    type: { name: string };
  };
  noNestedArgumentSupport: {
    message: string;
    type: { name: string; argType: string };
  };
  unsupportedFunctionForCommand: {
    message: string;
    type: { name: string; command: string };
  };
  unsupportedFunctionForCommandOption: {
    message: string;
    type: { name: string; command: string; option: string };
  };
  unsupportedLiteralOption: {
    message: string;
    type: { name: string; value: string; supportedOptions: string };
  };
  shadowFieldType: {
    message: string;
    type: { field: string; fieldType: string; newType: string };
  };
  unsupportedColumnTypeForCommand: {
    message: string;
    type: { command: string; type: string; givenType: string; column: string };
  };
  unknownDissectKeyword: {
    message: string;
    type: { keyword: string };
  };
  wrongOptionArgumentType: {
    message: string;
    type: { command: string; option: string; type: string; givenValue: string };
  };
  unknownInterval: {
    message: string;
    type: { value: string };
  };
  unsupportedTypeForCommand: {
    message: string;
    type: { command: string; value: string; type: string };
  };
  unknownPolicy: {
    message: string;
    type: { name: string };
  };
  unknownAggregateFunction: {
    message: string;
    type: { type: string; value: string };
  };
  wildcardNotSupportedForCommand: {
    message: string;
    type: { command: string; value: string };
  };
  noWildcardSupportAsArg: {
    message: string;
    type: { name: string };
  };
  unsupportedFieldType: {
    message: string;
    type: { field: string };
  };
  unsupportedMode: {
    message: string;
    type: { command: string; value: string; expected: string };
  };
  fnUnsupportedAfterCommand: {
    message: string;
    type: { function: string; command: string };
  };
  expectedConstant: {
    message: string;
    type: { fn: string; given: string };
  };
  metadataBracketsDeprecation: {
    message: string;
    type: {};
  };
  unknownMetadataField: {
    message: string;
    type: { value: string; availableFields: string };
  };
  wrongDissectOptionArgumentType: {
    message: string;
    type: { value: string | number };
  };
  noAggFunction: {
    message: string;
    type: {
      commandName: string;
      expression: string;
    };
  };
  expressionNotAggClosed: {
    message: string;
    type: {
      commandName: string;
      expression: string;
    };
  };
  aggInAggFunction: {
    message: string;
    type: {
      nestedAgg: string;
    };
  };
  onlyWhereCommandSupported: {
    message: string;
    type: { fn: string };
  };
  invalidJoinIndex: {
    message: string;
    type: { identifier: string };
  };
  tooManyForks: {
    message: string;
    type: {};
  };
}

export type ErrorTypes = keyof ValidationErrors;
export type ErrorValues<K extends ErrorTypes> = ValidationErrors[K]['type'];

export interface ValidationResult {
  errors: Array<ESQLMessage | EditorError>;
  warnings: ESQLMessage[];
}

export interface ValidationOptions {
  ignoreOnMissingCallbacks?: boolean;
}
