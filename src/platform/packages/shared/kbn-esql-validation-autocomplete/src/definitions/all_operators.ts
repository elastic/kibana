/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import {
  type FunctionDefinition,
  type FunctionParameterType,
  type FunctionReturnType,
  FunctionDefinitionTypes,
} from './types';
import { operatorFunctionDefinitions } from './generated/operators';
type MathFunctionSignature = [FunctionParameterType, FunctionParameterType, FunctionReturnType];

// https://www.elastic.co/guide/en/elasticsearch/reference/master/esql-functions-operators.html#_less_than
const baseComparisonTypeTable: MathFunctionSignature[] = [
  ['date', 'date', 'boolean'],
  ['double', 'double', 'boolean'],
  ['double', 'integer', 'boolean'],
  ['double', 'long', 'boolean'],
  ['integer', 'double', 'boolean'],
  ['integer', 'integer', 'boolean'],
  ['integer', 'long', 'boolean'],
  ['ip', 'ip', 'boolean'],
  ['keyword', 'keyword', 'boolean'],
  ['keyword', 'text', 'boolean'],
  ['long', 'double', 'boolean'],
  ['long', 'integer', 'boolean'],
  ['long', 'long', 'boolean'],
  ['text', 'keyword', 'boolean'],
  ['text', 'text', 'boolean'],
  ['unsigned_long', 'unsigned_long', 'boolean'],
  ['version', 'version', 'boolean'],
];

function createComparisonDefinition(
  {
    name,
    description,
    extraSignatures = [],
  }: {
    name: string;
    description: string;
    extraSignatures?: FunctionDefinition['signatures'];
  },
  validate?: FunctionDefinition['validate']
): FunctionDefinition {
  const commonSignatures = baseComparisonTypeTable.map((functionSignature) => {
    const [lhs, rhs, result] = functionSignature;
    return {
      params: [
        { name: 'left', type: lhs },
        { name: 'right', type: rhs },
      ],
      returnType: result,
    };
  });

  return {
    type: FunctionDefinitionTypes.OPERATOR,
    name,
    description,
    supportedCommands: ['eval', 'where', 'row', 'sort'],
    supportedOptions: ['by'],
    validate,
    signatures: [
      ...commonSignatures,
      // constant strings okay because of implicit casting for
      // string to version and ip
      //
      // boolean casting is handled on the specific comparison function
      // that support booleans
      //
      // date casting is handled in the validation routine since it's a
      // general rule. Look in compareLiteralType()
      ...(['ip', 'version'] as const).flatMap((type) => [
        {
          params: [
            { name: 'left', type },
            { name: 'right', type: 'text' as const, constantOnly: true },
          ],
          returnType: 'boolean' as const,
        },
        {
          params: [
            { name: 'left', type: 'text' as const, constantOnly: true },
            { name: 'right', type },
          ],
          returnType: 'boolean' as const,
        },
      ]),
      ...extraSignatures,
    ],
  };
}

// these functions are also in the operatorFunctionDefinitions. There is no way to extract them from there
// because the operatorFunctionDefinitions are generated from ES definitions. This is why we need to
// duplicate them here
export const comparisonFunctions: FunctionDefinition[] = [
  {
    name: '==',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.equalToDoc', {
      defaultMessage: 'Equal to',
    }),
    extraSignatures: [
      {
        params: [
          { name: 'left', type: 'boolean' as const },
          { name: 'right', type: 'boolean' as const },
        ],
        returnType: 'boolean' as const,
      },
      // constant strings okay because of implicit casting
      {
        params: [
          { name: 'left', type: 'boolean' as const },
          { name: 'right', type: 'keyword' as const, constantOnly: true },
        ],
        returnType: 'boolean' as const,
      },
      {
        params: [
          { name: 'left', type: 'keyword' as const, constantOnly: true },
          { name: 'right', type: 'boolean' as const },
        ],
        returnType: 'boolean' as const,
      },
    ],
  },
  {
    name: '!=',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.notEqualToDoc', {
      defaultMessage: 'Not equal to',
    }),
    extraSignatures: [
      {
        params: [
          { name: 'left', type: 'boolean' as const },
          { name: 'right', type: 'boolean' as const },
        ],
        returnType: 'boolean' as const,
      },
      // constant strings okay because of implicit casting
      {
        params: [
          { name: 'left', type: 'boolean' as const },
          { name: 'right', type: 'keyword' as const, constantOnly: true },
        ],
        returnType: 'boolean' as const,
      },
      {
        params: [
          { name: 'left', type: 'keyword' as const, constantOnly: true },
          { name: 'right', type: 'boolean' as const },
        ],
        returnType: 'boolean' as const,
      },
    ],
  },
  {
    name: '<',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.lessThanDoc', {
      defaultMessage: 'Less than',
    }),
  },
  {
    name: '>',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.greaterThanDoc', {
      defaultMessage: 'Greater than',
    }),
  },
  {
    name: '<=',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definition.lessThanOrEqualToDoc',
      {
        defaultMessage: 'Less than or equal to',
      }
    ),
  },
  {
    name: '>=',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definition.greaterThanOrEqualToDoc',
      {
        defaultMessage: 'Greater than or equal to',
      }
    ),
  },
].map((op): FunctionDefinition => createComparisonDefinition(op));

export const logicalOperators: FunctionDefinition[] = [
  {
    name: 'and',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.andDoc', {
      defaultMessage: 'and',
    }),
  },
  {
    name: 'or',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.orDoc', {
      defaultMessage: 'or',
    }),
  },
].map(({ name, description }) => ({
  type: FunctionDefinitionTypes.OPERATOR,
  name,
  description,
  supportedCommands: ['eval', 'where', 'row', 'sort'],
  supportedOptions: ['by'],
  signatures: [
    {
      params: [
        { name: 'left', type: 'boolean' as const },
        { name: 'right', type: 'boolean' as const },
      ],
      returnType: 'boolean',
    },
  ],
}));

const nullFunctions: FunctionDefinition[] = [
  {
    name: 'is null',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.isNullDoc', {
      defaultMessage: 'Predicate for NULL comparison: returns true if the value is NULL',
    }),
  },
  {
    name: 'is not null',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.isNotNullDoc', {
      defaultMessage: 'Predicate for NULL comparison: returns true if the value is not NULL',
    }),
  },
].map<FunctionDefinition>(({ name, description }) => ({
  type: FunctionDefinitionTypes.OPERATOR,
  name,
  description,
  supportedCommands: ['eval', 'where', 'row', 'sort'],
  signatures: [
    {
      params: [{ name: 'left', type: 'any' }],
      returnType: 'boolean',
    },
  ],
}));

const otherDefinitions: FunctionDefinition[] = [
  {
    type: FunctionDefinitionTypes.OPERATOR,
    name: 'not',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definition.notDoc', {
      defaultMessage: 'Not',
    }),
    supportedCommands: ['eval', 'where', 'row', 'sort'],
    supportedOptions: ['by'],
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
    supportedCommands: [
      'eval',
      'stats',
      'inlinestats',
      'metrics',
      'row',
      'dissect',
      'where',
      'enrich',
    ],
    supportedOptions: ['by', 'with'],
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
    supportedCommands: ['rename', 'join'],
    supportedOptions: [],
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
    supportedCommands: ['stats', 'inlinestats', 'metrics'],
    supportedOptions: [],
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
    supportedCommands: ['show'],
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
  ...nullFunctions,
  ...otherDefinitions,
];
