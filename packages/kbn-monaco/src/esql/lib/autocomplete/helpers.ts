/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mathOperatorsCommandsDefinitions } from './autocomplete_definitions';
import { dateExpressionDefinitions } from './autocomplete_definitions/date_math_expressions';

export function endsWithOpenBracket(text: string) {
  return /\($/.test(text);
}

export function isDateFunction(fnName: string) {
  // TODO: improve this and rely in signature in the future
  return ['to_datetime', 'date_trunc', 'date_parse'].includes(fnName.toLowerCase());
}

export function getDateMathOperation() {
  return mathOperatorsCommandsDefinitions.filter(({ label }) => ['+', '-'].includes(String(label)));
}

export function getDurationItemsWithQuantifier(quantifier: number = 1) {
  return dateExpressionDefinitions
    .filter(({ label }) => !/s$/.test(label.toString()))
    .map(({ label, insertText, ...rest }) => ({
      label: `${quantifier} ${label}`,
      insertText: `${quantifier} ${insertText}`,
      ...rest,
    }));
}
