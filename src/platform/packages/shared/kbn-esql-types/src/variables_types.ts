/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BehaviorSubject } from 'rxjs';

type PublishingSubject<T extends unknown = unknown> = Omit<BehaviorSubject<T>, 'next'>;

export enum VariableNamePrefix {
  IDENTIFIER = '??',
  VALUE = '?',
}

export enum ESQLVariableType {
  TIME_LITERAL = 'time_literal',
  FIELDS = 'fields',
  VALUES = 'values',
  MULTI_VALUES = 'multi_values',
  FUNCTIONS = 'functions',
}

/**
 * Types of ES|QL controls
 * - STATIC_VALUES: Static values that are not dependent on any query
 * - VALUES_FROM_QUERY: Values that are dependent on an ES|QL query
 */
export enum EsqlControlType {
  STATIC_VALUES = 'STATIC_VALUES',
  VALUES_FROM_QUERY = 'VALUES_FROM_QUERY',
}

export interface ESQLControlVariable {
  key: string;
  value: string | number | (string | number)[];
  type: ESQLVariableType;
  meta?: {
    // `controlledBy` is the ID of the control that publishes the variable
    controlledBy?: string;
    // `group` allows grouping of variables
    group?: string;
  };
}

export interface PublishesESQLVariable {
  esqlVariable$: PublishingSubject<ESQLControlVariable>;
}

export type ControlWidthOptions = 'small' | 'medium' | 'large';

export interface ESQLControlState {
  singleSelect?: boolean;
  title: string;
  selectedOptions: string[];
  variableName: string;
  variableType: ESQLVariableType;
  esqlQuery: string;
  controlType: EsqlControlType;
  // If the controlType is STATIC_VALUES, store the list of availableOptions in the control state
  // VALUES_FROM_QUERY controls will instead fetch available options at runtime
  availableOptions?: string[];
}

export const apiPublishesESQLVariable = (
  unknownApi: unknown
): unknownApi is PublishesESQLVariable => {
  return Boolean(unknownApi && (unknownApi as PublishesESQLVariable)?.esqlVariable$ !== undefined);
};

export interface PublishesESQLVariables {
  esqlVariables$: PublishingSubject<ESQLControlVariable[]>;
}

export const apiPublishesESQLVariables = (
  unknownApi: unknown
): unknownApi is PublishesESQLVariables => {
  return Boolean(
    unknownApi && (unknownApi as PublishesESQLVariables)?.esqlVariables$ !== undefined
  );
};

interface HasVariableName {
  variableName: string;
}

/**
 * Type guard to check if a control state object has a variable name property.
 * @param controlState - The control state object to check
 * @returns True if the control state has a defined variableName property
 */
export const controlHasVariableName = (controlState: unknown): controlState is HasVariableName => {
  return Boolean(
    controlState &&
      (controlState as HasVariableName)?.variableName !== undefined &&
      typeof (controlState as HasVariableName).variableName === 'string'
  );
};
