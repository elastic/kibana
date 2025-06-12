/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { type FunctionDefinition, FunctionDefinitionTypes, Location } from './types';
import { operatorFunctionDefinitions } from './generated/operators';

// Retrieve the definitions from the operatorFunctionDefinitions. In the operatorFunctionDefinitions there is no distinction between
// other operators and the comparison ones, so we do this here.
export const comparisonFunctions: FunctionDefinition[] = operatorFunctionDefinitions.filter(
  (op) =>
    op.name === '==' ||
    op.name === '!=' ||
    op.name === '<' ||
    op.name === '>' ||
    op.name === '<=' ||
    op.name === '>='
);

// Retrieve the definitions from the operatorFunctionDefinitions. In the operatorFunctionDefinitions there is no distinction between
// other operators and the logican ones, so we do this here.
export const logicalOperators: FunctionDefinition[] = operatorFunctionDefinitions.filter(
  (op) => op.name === 'and' || op.name === 'or'
);

const otherDefinitions: FunctionDefinition[] = [
  {
    type: FunctionDefinitionTypes.OPERATOR,
    name: 'not',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.notDoc', {
      defaultMessage: 'Not',
    }),
    locationsAvailable: [
      Location.EVAL,
      Location.WHERE,
      Location.ROW,
      Location.SORT,
      Location.STATS_BY,
      Location.STATS_WHERE,
    ],
    signatures: [
      {
        params: [{ name: 'expression', type: 'boolean' }],
        returnType: 'boolean',
      },
    ],
  },
  {
    type: FunctionDefinitionTypes.OPERATOR,
    name: '=',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.assignDoc', {
      defaultMessage: 'Assign (=)',
    }),
    locationsAvailable: [
      Location.EVAL,
      Location.STATS,
      Location.STATS_BY,
      Location.ROW,
      Location.WHERE,
      Location.ENRICH,
      Location.ENRICH_WITH,
      Location.DISSECT,
    ],
    signatures: [
      {
        params: [
          { name: 'left', type: 'any' },
          { name: 'right', type: 'any' },
        ],
        returnType: 'unknown',
      },
    ],
  },
  {
    type: FunctionDefinitionTypes.OPERATOR,
    name: 'as',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.asDoc', {
      defaultMessage: 'Rename as (AS)',
    }),
    locationsAvailable: [Location.RENAME, Location.JOIN],
    signatures: [
      {
        params: [
          { name: 'oldName', type: 'any' },
          { name: 'newName', type: 'any' },
        ],
        returnType: 'unknown',
      },
    ],
  },
  {
    type: FunctionDefinitionTypes.OPERATOR,
    name: 'where',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.whereDoc', {
      defaultMessage: 'WHERE operator',
    }),
    locationsAvailable: [Location.STATS],
    signatures: [
      {
        params: [
          { name: 'left', type: 'any' },
          { name: 'right', type: 'any' },
        ],
        returnType: 'unknown',
      },
    ],
  },
  {
    // TODO — this shouldn't be a function or an operator...
    name: 'info',
    type: FunctionDefinitionTypes.OPERATOR,
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.infoDoc', {
      defaultMessage: 'Show information about the current ES node',
    }),
    locationsAvailable: [Location.SHOW],
    signatures: [
      {
        params: [],
        returnType: 'unknown', // meaningless
      },
    ],
  },
];

export const operatorsDefinitions: FunctionDefinition[] = [
  ...operatorFunctionDefinitions,
  ...logicalOperators,
  ...otherDefinitions,
];
