/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { ESQLControlVariable } from '@kbn/esql-validation-autocomplete';

export class EsqlVariablesService {
  esqlVariables$: BehaviorSubject<ESQLControlVariable[]>;
  esqlQueryWithVariables: string;
  esqlVariables: ESQLControlVariable[] = [];

  constructor() {
    this.esqlVariables$ = new BehaviorSubject<ESQLControlVariable[]>([]);
    this.esqlVariables = [];
    this.esqlQueryWithVariables = '';
  }

  setEsqlQueryWithVariables(esqlQueryWithVariables: string) {
    this.esqlQueryWithVariables = esqlQueryWithVariables;
  }

  getEsqlQueryWithVariables(): string {
    return this.esqlQueryWithVariables;
  }

  addVariable(variable: ESQLControlVariable): void {
    const variables = [...this.esqlVariables];
    const variableExists = variables.find((v) => v.key === variable.key);
    if (variableExists) {
      return;
    }
    variables.push(variable);
    this.esqlVariables$.next(variables);
    this.esqlVariables = variables;
  }

  getVariables() {
    return this.esqlVariables;
  }

  getVariable(key: string) {
    return this.esqlVariables.find((variable) => variable.key === key);
  }

  getVariablesByType(type: ESQLControlVariable['type']) {
    return this.esqlVariables.filter((variable) => variable.type === type);
  }

  updateVariable(key: string, value: string, type: ESQLControlVariable['type']) {
    const variables = this.esqlVariables.map((variable) => {
      if (variable.key === key) {
        return { ...variable, value, type };
      }
      return variable;
    });
    this.esqlVariables$.next(variables);
    this.esqlVariables = variables;
  }

  removeVariable(key: string) {
    const variables = this.esqlVariables.filter((variable) => variable.key !== key);
    this.esqlVariables$.next(variables);
    this.esqlVariables = variables;
  }
}
