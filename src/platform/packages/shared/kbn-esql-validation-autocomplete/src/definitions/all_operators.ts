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
  ({ name }) =>
    name === '==' || name === '!=' || name === '<' || name === '>' || name === '<=' || name === '>='
);

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
      params: [
        { name: 'left', type: 'boolean' as const },
        { name: 'right', type: 'boolean' as const },
      ],
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
      Location.COMPLETION,
      Location.RENAME,
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

const isNotNullDefinition: FunctionDefinition = {
  type: FunctionDefinitionTypes.OPERATOR,
  name: 'is not null',
  description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.is_not_null', {
    defaultMessage: 'Use `IS NOT NULL` to filter data based on whether the field exists or not.',
  }),
  preview: false,
  alias: undefined,
  signatures: [
    {
      params: [
        {
          name: 'left',
          type: 'boolean',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'cartesian_point',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'cartesian_shape',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'date',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'date_nanos',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'double',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'geo_point',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'geo_shape',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'integer',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'ip',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'keyword',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'long',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'text',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'unsigned_long',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'version',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
  ],
  locationsAvailable: [
    Location.EVAL,
    Location.WHERE,
    Location.SORT,
    Location.ROW,
    Location.STATS_WHERE,
  ],
  validate: undefined,
  examples: ['FROM employees\n| WHERE is_rehired IS NOT NULL\n| STATS COUNT(emp_no)'],
};

const isNullDefinition: FunctionDefinition = {
  type: FunctionDefinitionTypes.OPERATOR,
  name: 'is null',
  description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.is_null', {
    defaultMessage: 'Use `IS NULL` to filter data based on whether the field exists or not.',
  }),
  preview: false,
  alias: undefined,
  signatures: [
    {
      params: [
        {
          name: 'left',
          type: 'boolean',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'cartesian_point',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'cartesian_shape',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'date',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'date_nanos',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'double',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'geo_point',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'geo_shape',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'integer',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'ip',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'keyword',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'long',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'text',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'unsigned_long',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
    {
      params: [
        {
          name: 'left',
          type: 'version',
          optional: false,
        },
      ],
      returnType: 'boolean',
    },
  ],
  locationsAvailable: [
    Location.EVAL,
    Location.WHERE,
    Location.SORT,
    Location.ROW,
    Location.STATS_WHERE,
  ],
  validate: undefined,
  examples: ['FROM employees\n| WHERE birth_date IS NULL'],
};

export const operatorsDefinitions: FunctionDefinition[] = [
  ...operatorFunctionDefinitions,
  isNullDefinition,
  isNotNullDefinition,
  ...logicalOperators,
  ...otherDefinitions,
];
