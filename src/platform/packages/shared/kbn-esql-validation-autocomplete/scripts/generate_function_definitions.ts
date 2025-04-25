/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readdirSync, readFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import _ from 'lodash';
import type { RecursivePartial } from '@kbn/utility-types';
import {
  FunctionDefinition,
  FunctionParameterType,
  FunctionReturnType,
  Signature,
  FunctionDefinitionTypes,
  Location,
} from '../src/definitions/types';
import { FULL_TEXT_SEARCH_FUNCTIONS } from '../src/shared/constants';
const aliasTable: Record<string, string[]> = {
  to_version: ['to_ver'],
  to_unsigned_long: ['to_ul', 'to_ulong'],
  to_boolean: ['to_bool'],
  to_string: ['to_str'],
  to_datetime: ['to_dt'],
  to_double: ['to_dbl'],
  to_integer: ['to_int'],
};
const aliases = new Set(Object.values(aliasTable).flat());

const bucketParameterTypes: Array<
  [
    FunctionParameterType,
    FunctionParameterType,
    FunctionParameterType | null,
    FunctionParameterType | null,
    FunctionReturnType
  ]
> = [
  // field   // bucket   //from    // to   //result
  ['date', 'date_period', null, null, 'date'],
  ['date', 'integer', 'date', 'date', 'date'],
  ['date_nanos', 'date_period', null, null, 'date_nanos'],
  ['date_nanos', 'integer', 'date', 'date', 'date_nanos'],
  // Modified time_duration to time_literal
  ['date', 'time_literal', null, null, 'date'],
  ['double', 'double', null, null, 'double'],
  ['double', 'integer', 'double', 'double', 'double'],
  ['double', 'integer', 'double', 'integer', 'double'],
  ['double', 'integer', 'double', 'long', 'double'],
  ['double', 'integer', 'integer', 'double', 'double'],
  ['double', 'integer', 'integer', 'integer', 'double'],
  ['double', 'integer', 'integer', 'long', 'double'],
  ['double', 'integer', 'long', 'double', 'double'],
  ['double', 'integer', 'long', 'integer', 'double'],
  ['double', 'integer', 'long', 'long', 'double'],
  ['integer', 'double', null, null, 'double'],
  ['integer', 'integer', 'double', 'double', 'double'],
  ['integer', 'integer', 'double', 'integer', 'double'],
  ['integer', 'integer', 'double', 'long', 'double'],
  ['integer', 'integer', 'integer', 'double', 'double'],
  ['integer', 'integer', 'integer', 'integer', 'double'],
  ['integer', 'integer', 'integer', 'long', 'double'],
  ['integer', 'integer', 'long', 'double', 'double'],
  ['integer', 'integer', 'long', 'integer', 'double'],
  ['integer', 'integer', 'long', 'long', 'double'],
  ['long', 'double', null, null, 'double'],
  ['long', 'integer', 'double', 'double', 'double'],
  ['long', 'integer', 'double', 'integer', 'double'],
  ['long', 'integer', 'double', 'long', 'double'],
  ['long', 'integer', 'integer', 'double', 'double'],
  ['long', 'integer', 'integer', 'integer', 'double'],
  ['long', 'integer', 'integer', 'long', 'double'],
  ['long', 'integer', 'long', 'double', 'double'],
  ['long', 'integer', 'long', 'integer', 'double'],
  ['long', 'integer', 'long', 'long', 'double'],
];

const defaultScalarFunctionLocations: Location[] = [
  Location.EVAL,
  Location.ROW,
  Location.SORT,
  Location.WHERE,
  Location.STATS,
  Location.STATS_BY,
  Location.STATS_WHERE,
];

const defaultAggFunctionLocations: Location[] = [Location.STATS];

// coalesce can be removed when a test is added for version type
// (https://github.com/elastic/elasticsearch/pull/109032#issuecomment-2150033350)
const excludedFunctions = new Set(['case', 'cast']);

const extraFunctions: FunctionDefinition[] = [
  {
    type: FunctionDefinitionTypes.SCALAR,
    name: 'case',
    description:
      'Accepts pairs of conditions and values. The function returns the value that belongs to the first condition that evaluates to `true`. If the number of arguments is odd, the last argument is the default value which is returned when no condition matches.',
    locationsAvailable: defaultScalarFunctionLocations,
    signatures: [
      {
        params: [
          { name: 'condition', type: 'boolean' },
          { name: 'value', type: 'any' },
        ],
        minParams: 2,
        returnType: 'unknown',
      },
    ],
    examples: [
      `from index | eval type = case(languages <= 1, "monolingual", languages <= 2, "bilingual", "polyglot")`,
    ],
  },
];

const validateLogFunctions = `(fnDef: ESQLFunction) => {
  const messages = [];
  // do not really care here about the base and field
  // just need to check both values are not negative
  for (const arg of fnDef.args) {
    if (isLiteralItem(arg) && Number(arg.value) < 0) {
      messages.push({
        type: 'warning' as const,
        code: 'logOfNegativeValue',
        text: i18n.translate(
          'kbn-esql-validation-autocomplete.esql.divide.warning.logOfNegativeValue',
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

const dateDiffSuggestions = [
  'year',
  'quarter',
  'month',
  'week',
  'day',
  'hour',
  'minute',
  'second',
  'millisecond',
  'microsecond',
  'nanosecond',
];

const dateDiffOptions = [
  'year',
  'years',
  'yy',
  'yyyy',
  'quarter',
  'quarters',
  'qq',
  'q',
  'month',
  'months',
  'mm',
  'm',
  'dayofyear',
  'dy',
  'y',
  'day',
  'days',
  'dd',
  'd',
  'week',
  'weeks',
  'wk',
  'ww',
  'weekday',
  'weekdays',
  'dw',
  'hour',
  'hours',
  'hh',
  'minute',
  'minutes',
  'mi',
  'n',
  'second',
  'seconds',
  'ss',
  's',
  'millisecond',
  'milliseconds',
  'ms',
  'microsecond',
  'microseconds',
  'mcs',
  'nanosecond',
  'nanoseconds',
  'ns',
];

const dateExtractOptions = [
  'ALIGNED_DAY_OF_WEEK_IN_MONTH',
  'ALIGNED_DAY_OF_WEEK_IN_YEAR',
  'ALIGNED_WEEK_OF_MONTH',
  'ALIGNED_WEEK_OF_YEAR',
  'AMPM_OF_DAY',
  'CLOCK_HOUR_OF_AMPM',
  'CLOCK_HOUR_OF_DAY',
  'DAY_OF_MONTH',
  'DAY_OF_WEEK',
  'DAY_OF_YEAR',
  'EPOCH_DAY',
  'ERA',
  'HOUR_OF_AMPM',
  'HOUR_OF_DAY',
  'INSTANT_SECONDS',
  'MICRO_OF_DAY',
  'MICRO_OF_SECOND',
  'MILLI_OF_DAY',
  'MILLI_OF_SECOND',
  'MINUTE_OF_DAY',
  'MINUTE_OF_HOUR',
  'MONTH_OF_YEAR',
  'NANO_OF_DAY',
  'NANO_OF_SECOND',
  'OFFSET_SECONDS',
  'PROLEPTIC_MONTH',
  'SECOND_OF_DAY',
  'SECOND_OF_MINUTE',
  'YEAR',
  'YEAR_OF_ERA',
];

/**
 * Enrichments for function definitions
 *
 * This is the place to put information that is not provided by Elasticsearch
 * and, hence, won't be present in the JSON file.
 */
const functionEnrichments: Record<string, RecursivePartial<FunctionDefinition>> = {
  log10: {
    validate: validateLogFunctions,
  },
  log: {
    validate: validateLogFunctions,
  },
  date_diff: {
    signatures: [
      {
        params: [{ acceptedValues: dateDiffOptions, literalSuggestions: dateDiffSuggestions }],
      },
    ],
  },
  date_extract: {
    signatures: [
      {
        params: [{ acceptedValues: dateExtractOptions }],
      },
    ],
  },
  date_trunc: {
    signatures: [
      {
        // override the first param to be of type time_literal
        params: [{ type: 'time_literal' }],
      },
    ],
  },
  mv_sort: {
    signatures: new Array(10).fill({
      params: [{}, { acceptedValues: ['asc', 'desc'] }],
    }),
  },
  percentile: {
    signatures: new Array(9).fill({
      params: [{}, { constantOnly: true }],
    }),
  },
  top: {
    signatures: new Array(6).fill({
      params: [{}, { constantOnly: true }, { constantOnly: true, acceptedValues: ['asc', 'desc'] }],
    }),
  },
  count: {
    signatures: [{ params: [{ supportsWildcard: true }] }],
  },
  qstr: {
    customParametersSnippet: `"""$0"""`,
  },
  kql: {
    customParametersSnippet: `"""$0"""`,
  },
};

const convertDateTime = (s: string) => (s === 'datetime' ? 'date' : s);

/**
 * Builds a function definition object from a row of the "meta functions" table
 * @param {Array<any>} value — the row of the "meta functions" table, corresponding to a single function definition
 * @param {*} columnIndices — the indices of the columns in the "meta functions" table
 * @returns
 */
function getFunctionDefinition(ESFunctionDefinition: Record<string, any>): FunctionDefinition {
  let locationsAvailable =
    ESFunctionDefinition.type === FunctionDefinitionTypes.SCALAR
      ? defaultScalarFunctionLocations
      : defaultAggFunctionLocations;

  // MATCH and QSRT has limited supported for where commands only
  if (FULL_TEXT_SEARCH_FUNCTIONS.includes(ESFunctionDefinition.name)) {
    locationsAvailable = [Location.WHERE];
  }
  const ret = {
    type: ESFunctionDefinition.type,
    name: ESFunctionDefinition.name,
    operator: ESFunctionDefinition.operator,
    locationsAvailable,
    description: ESFunctionDefinition.description,
    alias: aliasTable[ESFunctionDefinition.name],
    ignoreAsSuggestion: ESFunctionDefinition.snapshot_only,
    preview: ESFunctionDefinition.preview,
    signatures: _.uniqBy(
      ESFunctionDefinition.signatures.map((signature: any) => ({
        ...signature,
        params: signature.params.map((param: any, idx: number) => ({
          ...param,
          type: convertDateTime(param.type),
          description: undefined,
          ...(FULL_TEXT_SEARCH_FUNCTIONS.includes(ESFunctionDefinition.name)
            ? // Default to false. If set to true, this parameter does not accept a function or literal, only fields.
              param.name === 'field'
              ? { fieldsOnly: true }
              : { constantOnly: true }
            : {}),
        })),
        returnType: convertDateTime(signature.returnType),
        variadic: undefined, // we don't support variadic property
        minParams: signature.variadic
          ? signature.params.filter((param: any) => !param.optional).length
          : undefined,
      })),
      (el) => JSON.stringify(el)
    ),
    examples: ESFunctionDefinition.examples,
  };

  if (functionEnrichments[ret.name]) {
    _.merge(ret, functionEnrichments[ret.name]);
  }

  return ret as FunctionDefinition;
}

const comparisonOperatorSignatures = (['ip', 'version'] as const).flatMap((type) => [
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
]);
const operatorsMeta: Record<
  string,
  {
    name: string;
    isMathOperator: boolean;
    isComparisonOperator: boolean;
    extraSignatures?: Signature[];
  }
> = {
  add: {
    name: '+',
    isMathOperator: true,
    isComparisonOperator: false,
    extraSignatures: [
      {
        params: [
          { name: 'left', type: 'time_literal' as const },
          { name: 'right', type: 'date' as const },
        ],
        returnType: 'date' as const,
      },
      {
        params: [
          { name: 'left', type: 'date' as const },
          { name: 'right', type: 'time_literal' as const },
        ],
        returnType: 'date' as const,
      },
    ],
  },
  sub: {
    name: '-',
    isMathOperator: true,
    isComparisonOperator: false,
    extraSignatures: [
      {
        params: [
          { name: 'left', type: 'time_literal' as const },
          { name: 'right', type: 'date' as const },
        ],
        returnType: 'date' as const,
      },
      {
        params: [
          { name: 'left', type: 'date' as const },
          { name: 'right', type: 'time_literal' as const },
        ],
        returnType: 'date' as const,
      },
    ],
  },
  div: { name: '/', isMathOperator: true, isComparisonOperator: false },
  equals: {
    name: '==',
    isMathOperator: false,
    isComparisonOperator: true,
    extraSignatures: [
      ...comparisonOperatorSignatures,
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
  greater_than: {
    name: '>',
    isMathOperator: false,
    isComparisonOperator: true,
    extraSignatures: comparisonOperatorSignatures,
  },
  greater_than_or_equal: {
    name: '>=',
    isMathOperator: false,
    isComparisonOperator: true,
    extraSignatures: comparisonOperatorSignatures,
  },
  less_than: {
    name: '<',
    isMathOperator: false,
    isComparisonOperator: true,
    extraSignatures: comparisonOperatorSignatures,
  },
  less_than_or_equal: { name: '<=', isMathOperator: false, isComparisonOperator: true },
  not_equals: {
    name: '!=',
    isMathOperator: false,
    isComparisonOperator: true,
    extraSignatures: [
      ...comparisonOperatorSignatures,
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
  mod: { name: '%', isMathOperator: true, isComparisonOperator: false },
  mul: { name: '*', isMathOperator: true, isComparisonOperator: false },
  like: {
    name: 'like',
    isMathOperator: false,
    isComparisonOperator: false,
    extraSignatures: [
      {
        params: [
          {
            name: 'str',
            type: 'text',
            optional: false,
          },
          {
            name: 'pattern',
            type: 'keyword',
            optional: false,
          },
        ],
        returnType: 'boolean',
        minParams: 2,
      },
      {
        params: [
          {
            name: 'str',
            type: 'keyword',
            optional: false,
          },
          {
            name: 'pattern',
            type: 'text',
            optional: false,
          },
        ],
        returnType: 'boolean',
        minParams: 2,
      },
    ],
  },

  rlike: {
    name: 'rlike',
    isMathOperator: false,
    isComparisonOperator: false,
    extraSignatures: [
      {
        params: [
          {
            name: 'str',
            type: 'text',
            optional: false,
          },
          {
            name: 'pattern',
            type: 'keyword',
            optional: false,
          },
        ],
        returnType: 'boolean',
        minParams: 2,
      },
      {
        params: [
          {
            name: 'str',
            type: 'keyword',
            optional: false,
          },
          {
            name: 'pattern',
            type: 'text',
            optional: false,
          },
        ],
        returnType: 'boolean',
        minParams: 2,
      },
    ],
  },
};

const validators: Record<string, string> = {
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
              'kbn-esql-validation-autocomplete.esql.divide.warning.divideByZero',
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
              'kbn-esql-validation-autocomplete.esql.divide.warning.zeroModule',
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

/**
 * Elasticsearch doc exports name as 'lhs' or 'rhs' instead of 'left' or 'right'
 * @param str
 * @returns
 */
const replaceParamName = (str: string) => {
  switch (str) {
    case 'lhs':
      return 'left';
    case 'rhs':
      return 'right';

    // @todo: For in function where Kibana doesn't interpret field and inlist
    case 'field':
      return 'left';
    case 'inlist':
      return 'right';
    default:
      return str;
  }
};

const enrichGrouping = (
  groupingFunctionDefinitions: FunctionDefinition[]
): FunctionDefinition[] => {
  return groupingFunctionDefinitions.map((op) => {
    if (op.name === 'bucket') {
      const signatures = [
        ...bucketParameterTypes.map((signature) => {
          const [fieldType, bucketType, fromType, toType, resultType] = signature;
          return {
            params: [
              { name: 'field', type: fieldType },
              { name: 'buckets', type: bucketType, constantOnly: true },
              ...(fromType ? [{ name: 'startDate', type: fromType, constantOnly: true }] : []),
              ...(toType ? [{ name: 'endDate', type: toType, constantOnly: true }] : []),
            ],
            returnType: resultType,
          };
        }),
      ];
      return {
        ...op,
        locationsAvailable: [...op.locationsAvailable, Location.STATS_BY],
        signatures,
      };
    }
    return {
      ...op,
      locationsAvailable: [...op.locationsAvailable, Location.STATS_BY],
    };
  });
};

const enrichOperators = (
  operatorsFunctionDefinitions: FunctionDefinition[]
): FunctionDefinition[] => {
  // @ts-expect-error Stringified version of the validator function
  return operatorsFunctionDefinitions.map((op) => {
    const isMathOperator =
      Object.hasOwn(operatorsMeta, op.name) && operatorsMeta[op.name]?.isMathOperator;
    const isComparisonOperator =
      Object.hasOwn(operatorsMeta, op.name) && operatorsMeta[op.name]?.isComparisonOperator;

    // IS NULL | IS NOT NULL
    const arePredicates =
      op.operator?.toLowerCase() === 'is null' || op.operator?.toLowerCase() === 'is not null';

    const isInOperator = op.name === 'in' || op.name === 'not_in';
    const isLikeOperator = /like/i.test(op.name);
    const isNotOperator =
      op.name?.toLowerCase()?.startsWith('not_') && (isInOperator || isLikeOperator);

    let signatures = op.signatures.map((s) => ({
      ...s,
      // Elasticsearch docs uses lhs and rhs instead of left and right that Kibana code uses
      params: s.params.map((param) => ({ ...param, name: replaceParamName(param.name) })),
    }));

    let locationsAvailable = op.locationsAvailable;

    if (isComparisonOperator) {
      locationsAvailable = _.uniq([
        ...op.locationsAvailable,
        Location.EVAL,
        Location.WHERE,
        Location.ROW,
        Location.SORT,
        Location.STATS_WHERE,
        Location.STATS_BY,
      ]);
    }
    if (isMathOperator) {
      locationsAvailable = _.uniq([
        ...op.locationsAvailable,
        Location.EVAL,
        Location.WHERE,
        Location.ROW,
        Location.SORT,
        Location.STATS,
        Location.STATS_WHERE,
        Location.STATS_BY,
      ]);
    }
    if (isInOperator || isLikeOperator || isNotOperator || arePredicates) {
      locationsAvailable = [
        Location.EVAL,
        Location.WHERE,
        Location.SORT,
        Location.ROW,
        Location.STATS_WHERE,
      ];
    }
    if (isInOperator) {
      // Override the signatures to be array types instead of singular
      // i.e. right: 'keyword' -> right: 'keyword[]'
      // so that in would open up ($0)
      signatures = signatures.map((s) => ({
        ...s,
        params: s.params.map((p, idx) => ({
          ...p,
          type: `${p.type}${idx === 1 ? '[]' : ''}` as FunctionParameterType,
        })),
      }));
    }
    if (
      Object.hasOwn(operatorsMeta, op.name) &&
      Array.isArray(operatorsMeta[op.name]?.extraSignatures)
    ) {
      signatures.push(...(operatorsMeta[op.name].extraSignatures ?? []));
    }

    return {
      ...op,
      signatures,
      // Elasticsearch docs does not include the full supported commands for math operators
      // so we are overriding to add proper support
      locationsAvailable,
      type: FunctionDefinitionTypes.OPERATOR,
      validate: validators[op.name],
      ...(isNotOperator ? { ignoreAsSuggestion: true } : {}),
    };
  });
};

function printGeneratedFunctionsFile(
  functionDefinitions: FunctionDefinition[],
  functionsType: FunctionDefinitionTypes
) {
  /**
   * Deals with asciidoc internal cross-references in the function descriptions
   *
   * Examples:
   * <<esql-mv_max>> -> `MV_MAX`
   * <<esql-st_intersects,ST_INTERSECTS>> -> `ST_INTERSECTS`
   * <<esql-multivalued-fields, multivalued fields>> -> multivalued fields
   */
  const removeAsciiDocInternalCrossReferences = (
    asciidocString: string,
    functionNames: string[]
  ) => {
    const internalCrossReferenceRegex = /<<(.+?)(,.+?)?>>/g;

    const extractPossibleFunctionName = (id: string) => id.replace('esql-', '');

    return asciidocString.replace(internalCrossReferenceRegex, (_match, anchorId, linkText) => {
      const ret = linkText ? linkText.slice(1) : anchorId;

      const matchingFunction = functionNames.find(
        (name) =>
          extractPossibleFunctionName(ret) === name.toLowerCase() ||
          extractPossibleFunctionName(ret) === name.toUpperCase()
      );
      return matchingFunction ? `\`${matchingFunction.toUpperCase()}\`` : ret;
    });
  };

  const removeInlineAsciiDocLinks = (asciidocString: string) => {
    const inlineLinkRegex = /\{.+?\}\/.+?\[(.+?)\]/g;

    return asciidocString.replace(inlineLinkRegex, '$1');
  };

  const getDefinitionName = (name: string) => _.camelCase(`${name}Definition`);

  const printFunctionDefinition = (
    functionDefinition: FunctionDefinition,
    functionNames: string[]
  ) => {
    const { type, name, description, alias, signatures, operator, customParametersSnippet } =
      functionDefinition;

    let functionName = operator?.toLowerCase() ?? name.toLowerCase();
    if (functionName.includes('not') && functionName !== 'is not null') {
      functionName = name;
    }
    if (name.toLowerCase() === 'match') {
      functionName = 'match';
    }

    // Map locationsAvailable to enum names
    const locationsAvailable = functionDefinition.locationsAvailable.map(
      (location) => `Location.${location.toUpperCase()}`
    );

    return `// Do not edit this manually... generated by scripts/generate_function_definitions.ts
    const ${getDefinitionName(name)}: FunctionDefinition = {
    type: FunctionDefinitionTypes.${type.toUpperCase()},
    name: '${functionName}',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.${name}', { defaultMessage: ${JSON.stringify(
      removeAsciiDocInternalCrossReferences(removeInlineAsciiDocLinks(description), functionNames)
    )} }),${functionDefinition.ignoreAsSuggestion ? 'ignoreAsSuggestion: true,' : ''}
    preview: ${functionDefinition.preview || 'false'},
    alias: ${alias ? `['${alias.join("', '")}']` : 'undefined'},
    signatures: ${JSON.stringify(signatures, null, 2)},
    locationsAvailable: [${locationsAvailable.join(', ')}],
    validate: ${functionDefinition.validate || 'undefined'},
    examples: ${JSON.stringify(functionDefinition.examples || [])},${
      customParametersSnippet
        ? `\ncustomParametersSnippet: ${JSON.stringify(customParametersSnippet)},`
        : ''
    }
}`;
  };

  const fileHeader = `/**
 * __AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.__
 *
 * @note This file is generated by the \`generate_function_definitions.ts\`
 * script. Do not edit it manually.
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 */

import { i18n } from '@kbn/i18n';
import { type FunctionDefinition, FunctionDefinitionTypes, Location } from '../types';
${
  functionsType === FunctionDefinitionTypes.SCALAR
    ? `import type { ESQLFunction } from '@kbn/esql-ast';
import { isLiteralItem } from '../../shared/helpers';`
    : ''
}
${
  functionsType === FunctionDefinitionTypes.OPERATOR
    ? `import { isNumericType } from '../../shared/esql_types';`
    : ''
}



`;

  const functionDefinitionsString = functionDefinitions
    .map((def) =>
      printFunctionDefinition(
        def,
        functionDefinitions.map(({ name }) => name)
      )
    )
    .join('\n\n');

  const fileContents = `${fileHeader}${functionDefinitionsString}
  export const ${functionsType}FunctionDefinitions = [${functionDefinitions
    .map(({ name }) => getDefinitionName(name))
    .join(',\n')}];`;

  return fileContents;
}

(async function main() {
  const pathToElasticsearch = process.argv[2];
  if (!pathToElasticsearch) {
    throw new Error('Path to Elasticsearch is required');
  }

  const ESFunctionDefinitionsDirectory = join(
    pathToElasticsearch,
    '/docs/reference/query-languages/esql/kibana/definition/functions'
  );

  const ESOperatorsDefinitionsDirectory = join(
    pathToElasticsearch,
    '/docs/reference/query-languages/esql/kibana/definition/operators'
  );

  // read all ES function definitions (the directory is full of JSON files) and create an array of definitions
  const ESFunctionDefinitions = readdirSync(ESFunctionDefinitionsDirectory).map((file) =>
    JSON.parse(readFileSync(`${ESFunctionDefinitionsDirectory}/${file}`, 'utf-8'))
  );

  const ESFOperatorDefinitions = readdirSync(ESOperatorsDefinitionsDirectory).map((file) =>
    JSON.parse(readFileSync(`${ESOperatorsDefinitionsDirectory}/${file}`, 'utf-8'))
  );

  const allFunctionDefinitions = ESFunctionDefinitions.concat(ESFOperatorDefinitions);

  const scalarFunctionDefinitions: FunctionDefinition[] = [];
  const aggFunctionDefinitions: FunctionDefinition[] = [];
  const operatorDefinitions: FunctionDefinition[] = [];
  const groupingFunctionDefinitions: FunctionDefinition[] = [];

  for (const ESDefinition of allFunctionDefinitions) {
    if (aliases.has(ESDefinition.name) || excludedFunctions.has(ESDefinition.name)) {
      continue;
    }

    const functionDefinition = getFunctionDefinition(ESDefinition);
    const isLikeOperator = functionDefinition.name.toLowerCase().includes('like');
    const arePredicates = functionDefinition.name.toLowerCase().includes('predicates');
    if (arePredicates) {
      continue;
    }

    if (functionDefinition.name.toLowerCase() === 'match') {
      scalarFunctionDefinitions.push({
        ...functionDefinition,
        type: FunctionDefinitionTypes.SCALAR,
      });
      continue;
    }

    if (functionDefinition.type === FunctionDefinitionTypes.OPERATOR || isLikeOperator) {
      operatorDefinitions.push(functionDefinition);
    }
    if (functionDefinition.type === FunctionDefinitionTypes.SCALAR && !isLikeOperator) {
      scalarFunctionDefinitions.push(functionDefinition);
    } else if (functionDefinition.type === FunctionDefinitionTypes.AGG) {
      aggFunctionDefinitions.push(functionDefinition);
    } else if (functionDefinition.type === FunctionDefinitionTypes.GROUPING) {
      groupingFunctionDefinitions.push(functionDefinition);
    }
  }

  scalarFunctionDefinitions.push(...extraFunctions);

  await writeFile(
    join(__dirname, '../src/definitions/generated/scalar_functions.ts'),
    printGeneratedFunctionsFile(scalarFunctionDefinitions, FunctionDefinitionTypes.SCALAR)
  );
  await writeFile(
    join(__dirname, '../src/definitions/generated/aggregation_functions.ts'),
    printGeneratedFunctionsFile(aggFunctionDefinitions, FunctionDefinitionTypes.AGG)
  );
  await writeFile(
    join(__dirname, '../src/definitions/generated/operators.ts'),
    printGeneratedFunctionsFile(
      enrichOperators(operatorDefinitions),
      FunctionDefinitionTypes.OPERATOR
    )
  );
  await writeFile(
    join(__dirname, '../src/definitions/generated/grouping_functions.ts'),
    printGeneratedFunctionsFile(
      enrichGrouping(groupingFunctionDefinitions),
      FunctionDefinitionTypes.GROUPING
    )
  );
})();
