/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLControlVariable } from '@kbn/esql-validation-autocomplete';

export class EsqlVariablesService {
  esqlVariables: ESQLControlVariable[] = [];
  areSuggestionsEnabled: boolean = false;

  enableSuggestions() {
    this.areSuggestionsEnabled = true;
  }

  disableSuggestions() {
    this.areSuggestionsEnabled = false;
  }

  addVariable(variable: ESQLControlVariable): void {
    const variables = [...this.esqlVariables];
    const variableExists = variables.find((v) => v.key === variable.key);
    if (variableExists) {
      return;
    }
    variables.push({
      ...variable,
      value: Number.isNaN(Number(variable.value)) ? variable.value : Number(variable.value),
    });
    this.esqlVariables = variables;
  }

  clearVariables() {
    this.esqlVariables = [];
  }
}
