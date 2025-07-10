/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const validateLogFunctions = `(fnDef: ESQLFunction) => {
  const messages = [];
  // do not really care here about the base and field
  // just need to check both values are not negative
  for (const arg of fnDef.args) {
    if (isLiteral(arg) && Number(arg.value) < 0) {
      messages.push({
        type: 'warning' as const,
        code: 'logOfNegativeValue',
        text: i18n.translate(
          'kbn-esql-ast.esql.divide.warning.logOfNegativeValue',
          {
            defaultMessage: 'Log of a negative number results in null: {value}',
            values: {
              value: arg.value,
            },
          }
        ),
        location: arg.location,
      });
    }
  }
  return messages;
}`;

export const mathValidators: Record<string, string> = {
  div: `(fnDef) => {
    const [left, right] = fnDef.args;
    const messages = [];
    if (!Array.isArray(left) && !Array.isArray(right)) {
      if (right.type === 'literal' && isNumericType(right.literalType)) {
        if (right.value === 0) {
          messages.push({
            type: 'warning' as const,
            code: 'divideByZero',
            text: i18n.translate(
              'kbn-esql-ast.esql.divide.warning.divideByZero',
              {
                defaultMessage: 'Cannot divide by zero: {left}/{right}',
                values: {
                  left: left.text,
                  right: right.value,
                },
              }
            ),
            location: fnDef.location,
          });
        }
      }
    }
    return messages;
  }`,
  mod: `(fnDef) => {
    const [left, right] = fnDef.args;
    const messages = [];
    if (!Array.isArray(left) && !Array.isArray(right)) {
      if (right.type === 'literal' && isNumericType(right.literalType)) {
        if (right.value === 0) {
          messages.push({
            type: 'warning' as const,
            code: 'moduleByZero',
            text: i18n.translate(
              'kbn-esql-ast.esql.divide.warning.zeroModule',
              {
                defaultMessage: 'Module by zero can return null value: {left}%{right}',
                values: {
                  left: left.text,
                  right: right.value,
                },
              }
            ),
            location: fnDef.location,
          });
        }
      }
    }
    return messages;
  }`,
};
