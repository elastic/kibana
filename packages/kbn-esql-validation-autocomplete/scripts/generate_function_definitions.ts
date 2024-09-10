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
import { FunctionDefinition } from '../src/definitions/types';

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

const scalarSupportedCommandsAndOptions = {
  supportedCommands: ['stats', 'inlinestats', 'metrics', 'eval', 'where', 'row', 'sort'],
  supportedOptions: ['by'],
};

const aggregationSupportedCommandsAndOptions = {
  supportedCommands: ['stats', 'inlinestats', 'metrics'],
};

// coalesce can be removed when a test is added for version type
// (https://github.com/elastic/elasticsearch/pull/109032#issuecomment-2150033350)
const excludedFunctions = new Set(['bucket', 'case']);

const extraFunctions: FunctionDefinition[] = [
  {
    type: 'eval',
    name: 'case',
    description:
      'Accepts pairs of conditions and values. The function returns the value that belongs to the first condition that evaluates to `true`. If the number of arguments is odd, the last argument is the default value which is returned when no condition matches.',
    ...scalarSupportedCommandsAndOptions,
    signatures: [
      {
        params: [
          { name: 'condition', type: 'boolean' },
          { name: 'value', type: 'any' },
        ],
        minParams: 2,
        returnType: 'any',
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
    signatures: new Array(9).fill({
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
};

const convertDateTime = (s: string) => (s === 'datetime' ? 'date' : s);

/**
 * Builds a function definition object from a row of the "meta functions" table
 * @param {Array<any>} value — the row of the "meta functions" table, corresponding to a single function definition
 * @param {*} columnIndices — the indices of the columns in the "meta functions" table
 * @returns
 */
function getFunctionDefinition(ESFunctionDefinition: Record<string, any>): FunctionDefinition {
  const ret = {
    type: ESFunctionDefinition.type,
    name: ESFunctionDefinition.name,
    ...(ESFunctionDefinition.type === 'eval'
      ? scalarSupportedCommandsAndOptions
      : aggregationSupportedCommandsAndOptions),
    description: ESFunctionDefinition.description,
    alias: aliasTable[ESFunctionDefinition.name],
    signatures: _.uniqBy(
      ESFunctionDefinition.signatures.map((signature: any) => ({
        ...signature,
        params: signature.params.map((param: any) => ({
          ...param,
          type: convertDateTime(param.type),
          description: undefined,
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

function printGeneratedFunctionsFile(
  functionDefinitions: FunctionDefinition[],
  functionsType: 'aggregation' | 'scalar'
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
    const { type, name, description, alias, signatures } = functionDefinition;

    return `// Do not edit this manually... generated by scripts/generate_function_definitions.ts
    const ${getDefinitionName(name)}: FunctionDefinition = {
    type: '${type}',
    name: '${name}',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.${name}', { defaultMessage: ${JSON.stringify(
      removeAsciiDocInternalCrossReferences(removeInlineAsciiDocLinks(description), functionNames)
    )} }),
    alias: ${alias ? `['${alias.join("', '")}']` : 'undefined'},
    signatures: ${JSON.stringify(signatures, null, 2)},
    supportedCommands: ${JSON.stringify(functionDefinition.supportedCommands)},
    supportedOptions: ${JSON.stringify(functionDefinition.supportedOptions)},
    validate: ${functionDefinition.validate || 'undefined'},
    examples: ${JSON.stringify(functionDefinition.examples || [])},
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
import type { FunctionDefinition } from '../types';
${
  functionsType === 'scalar'
    ? `import type { ESQLFunction } from '@kbn/esql-ast';
import { isLiteralItem } from '../../shared/helpers';`
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

  const ESFunctionDefinitionsDirectory = join(
    pathToElasticsearch,
    'docs/reference/esql/functions/kibana/definition'
  );

  // read all ES function definitions (the directory is full of JSON files) and create an array of definitions
  const ESFunctionDefinitions = readdirSync(ESFunctionDefinitionsDirectory).map((file) =>
    JSON.parse(readFileSync(`${ESFunctionDefinitionsDirectory}/${file}`, 'utf-8'))
  );

  const scalarFunctionDefinitions: FunctionDefinition[] = [];
  const aggFunctionDefinitions: FunctionDefinition[] = [];
  for (const ESDefinition of ESFunctionDefinitions) {
    if (aliases.has(ESDefinition.name) || excludedFunctions.has(ESDefinition.name)) {
      continue;
    }

    const functionDefinition = getFunctionDefinition(ESDefinition);

    if (functionDefinition.type === 'eval') {
      scalarFunctionDefinitions.push(functionDefinition);
    } else if (functionDefinition.type === 'agg') {
      aggFunctionDefinitions.push(functionDefinition);
    }
  }

  scalarFunctionDefinitions.push(...extraFunctions);

  await writeFile(
    join(__dirname, '../src/definitions/generated/scalar_functions.ts'),
    printGeneratedFunctionsFile(scalarFunctionDefinitions, 'scalar')
  );
  await writeFile(
    join(__dirname, '../src/definitions/generated/aggregation_functions.ts'),
    printGeneratedFunctionsFile(aggFunctionDefinitions, 'aggregation')
  );
})();
