/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ESQLMessage, ESQLLocation } from '@kbn/esql-ast';
import type { EditorError } from '../types';

export interface ESQLVariable {
  name: string;
  type: string;
  location: ESQLLocation;
}

export interface ESQLRealField {
  name: string;
  type: string;
}

export interface ESQLPolicy {
  name: string;
  sourceIndices: string[];
  matchField: string;
  enrichFields: string[];
}

export interface ReferenceMaps {
  sources: Set<string>;
  variables: Map<string, ESQLVariable[]>;
  fields: Map<string, ESQLRealField>;
  policies: Map<string, ESQLPolicy>;
  query: string;
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
    type: { command: string; type: string; typeCount: number; givenType: string; column: string };
  };
  unknownOption: {
    message: string;
    type: { command: string; option: string };
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
  unsupportedSetting: {
    message: string;
    type: { setting: string; expected: string };
  };
  unsupportedSettingCommandValue: {
    message: string;
    type: { command: string; value: string; expected: string };
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
