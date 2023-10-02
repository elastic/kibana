/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ESQLMessage } from '../types';

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
    type: { fn: string; numArgs: number; passedArgs: number };
  };
  unknownColumn: {
    message: string;
    type: { value: string | number };
  };
  unknownFunction: {
    message: string;
    type: { name: string };
  };
  noNestedArgumentSupport: {
    message: string;
    type: { name: string; argType: string };
  };
  unsupportedFunction: {
    message: string;
    type: { name: string; command: string };
  };
}

export type ErrorTypes = keyof ValidationErrors;
export type ErrorValues<K extends ErrorTypes> = ValidationErrors[K]['type'];

export interface ValidationResult {
  errors: ESQLMessage[];
  warnings: ESQLMessage[];
}
