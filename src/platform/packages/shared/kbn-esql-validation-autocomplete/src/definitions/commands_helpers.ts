/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  type ESQLAstItem,
  type ESQLFunction,
  isWhereExpression,
  isFieldExpression,
  Walker,
  ESQLCommand,
  ESQLColumn,
} from '@kbn/esql-ast';
import { i18n } from '@kbn/i18n';
import {
  getFunctionDefinition,
  isFunctionItem,
  isFunctionOperatorParam,
  isLiteralItem,
} from '../shared/helpers';
import { FieldType, FunctionDefinitionTypes } from './types';
import { getMessageFromId } from '../validation/errors';
import { ESQLFieldWithMetadata } from '../validation/types';

function isAggregation(arg: ESQLAstItem): arg is ESQLFunction {
  return (
    isFunctionItem(arg) && getFunctionDefinition(arg.name)?.type === FunctionDefinitionTypes.AGG
  );
}

function isNotAnAggregation(arg: ESQLAstItem): arg is ESQLFunction {
  return (
    isFunctionItem(arg) && getFunctionDefinition(arg.name)?.type !== FunctionDefinitionTypes.AGG
  );
}

// now check that:
// * the agg function is at root level
// * or if it's a operators function, then all operands are agg functions or literals
// * or if it's a eval function then all arguments are agg functions or literals
// * or if a named param is used
export function checkFunctionContent(arg: ESQLFunction) {
  // TODO the grouping function check may not
  // hold true for all future cases
  if (isAggregation(arg) || isFunctionOperatorParam(arg)) {
    return true;
  }
  return (arg as ESQLFunction).args.every((subArg): boolean => {
    // Differentiate between array and non-array arguments
    if (Array.isArray(subArg)) {
      return subArg.every((item) => checkFunctionContent(item as ESQLFunction));
    }
    return (
      isLiteralItem(subArg) ||
      isAggregation(subArg) ||
      (isNotAnAggregation(subArg) ? checkFunctionContent(subArg) : false)
    );
  });
}

export function checkAggExistence(arg: ESQLFunction): boolean {
  if (isWhereExpression(arg)) {
    return checkAggExistence(arg.args[0] as ESQLFunction);
  }

  if (isFieldExpression(arg)) {
    const agg = arg.args[1];
    const firstFunction = Walker.match(agg, { type: 'function' });

    if (!firstFunction) {
      return false;
    }

    return checkAggExistence(firstFunction as ESQLFunction);
  }

  // TODO the grouping function check may not
  // hold true for all future cases
  if (isAggregation(arg) || isFunctionOperatorParam(arg)) {
    return true;
  }

  if (isNotAnAggregation(arg)) {
    return (arg as ESQLFunction).args.filter(isFunctionItem).some(checkAggExistence);
  }

  return false;
}

export const ENRICH_MODES = [
  {
    name: 'any',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.ccqAnyDoc', {
      defaultMessage: 'Enrich takes place on any cluster',
    }),
  },
  {
    name: 'coordinator',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.ccqCoordinatorDoc',
      {
        defaultMessage: 'Enrich takes place on the coordinating cluster receiving an ES|QL',
      }
    ),
  },
  {
    name: 'remote',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.ccqRemoteDoc', {
      defaultMessage: 'Enrich takes place on the cluster hosting the target index.',
    }),
  },
];

export const validateColumnForGrokDissect = (
  command: ESQLCommand,
  { fields }: { fields: Map<string, ESQLFieldWithMetadata> }
) => {
  const acceptedColumnTypes: FieldType[] = ['keyword', 'text'];
  const astCol = command.args[0] as ESQLColumn;
  const columnRef = fields.get(astCol.name);

  if (columnRef && !acceptedColumnTypes.includes(columnRef.type)) {
    return [
      getMessageFromId({
        messageId: 'unsupportedColumnTypeForCommand',
        values: {
          command: command.name.toUpperCase(),
          type: acceptedColumnTypes.join(', '),
          givenType: columnRef.type,
          column: astCol.name,
        },
        locations: astCol.location,
      }),
    ];
  }

  return [];
};
