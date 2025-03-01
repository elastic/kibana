/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

type PublishingSubject<T extends unknown = unknown> = Omit<BehaviorSubject<T>, 'next'>;

export enum ESQLVariableType {
  TIME_LITERAL = 'time_literal',
  FIELDS = 'fields',
  VALUES = 'values',
  FUNCTIONS = 'functions',
}

export interface ESQLControlVariable {
  key: string;
  value: string | number;
  type: ESQLVariableType;
}

export interface PublishesESQLVariable {
  esqlVariable$: PublishingSubject<ESQLControlVariable>;
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
