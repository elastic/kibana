/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ESQLCommand, ESQLMessage, ESQLFunction } from '../../../types';
import { isFunctionExpression, isWhereExpression } from '../../../ast/is';
import { isAssignment, checkAggExistence, checkFunctionContent } from './utils';

export const validate = (command: ESQLCommand): ESQLMessage[] => {
  const messages: ESQLMessage[] = [];
  const commandName = command.name.toUpperCase();
  if (!command.args.length) {
    messages.push({
      location: command.location,
      text: i18n.translate('kbn-esql-ast.esql.validation.statsNoArguments', {
        defaultMessage:
          'At least one aggregation or grouping expression required in [{commandName}]',
        values: { commandName },
      }),
      type: 'error',
      code: 'statsNoArguments',
    });
  }

  // now that all functions are supported, there's a specific check to perform
  // unfortunately the logic here is a bit complex as it needs to dig deeper into the args
  // until an agg function is detected
  // in the long run this might be integrated into the validation function
  const statsArg = command.args
    .flatMap((arg) => {
      if (isWhereExpression(arg) && isFunctionExpression(arg.args[0])) {
        arg = arg.args[0] as ESQLFunction;
      }

      return isAssignment(arg) ? arg.args[1] : arg;
    })
    .filter(isFunctionExpression);

  if (statsArg.length) {
    // first check: is there an agg function somewhere?
    const noAggsExpressions = statsArg.filter((arg) => !checkAggExistence(arg));

    if (noAggsExpressions.length) {
      messages.push(
        ...noAggsExpressions.map((fn) => ({
          location: fn.location,
          text: i18n.translate('kbn-esql-ast.esql.validation.statsNoAggFunction', {
            defaultMessage:
              'At least one aggregation function required in [{commandName}], found [{expression}]',
            values: {
              expression: fn.text,
              commandName,
            },
          }),
          type: 'error' as const,
          code: 'statsNoAggFunction',
        }))
      );
    } else {
      // @TODO: improve here the check to get the last instance of the invalidExpression
      // to provide a better location for the error message
      // i.e. STATS round(round(round( a + sum(b) )))
      // should return the location of the + node, just before the agg one
      const invalidExpressions = statsArg.filter((arg) => !checkFunctionContent(arg));

      if (invalidExpressions.length) {
        messages.push(
          ...invalidExpressions.map((fn) => ({
            location: fn.location,
            text: i18n.translate('kbn-esql-ast.esql.validation.noCombinationOfAggAndNonAggValues', {
              defaultMessage:
                'Cannot combine aggregation and non-aggregation values in [{commandName}], found [{expression}]',
              values: {
                expression: fn.text,
                commandName,
              },
            }),
            type: 'error' as const,
            code: 'statsNoCombinationOfAggAndNonAggValues',
          }))
        );
      }
    }
  }

  return messages;
};
