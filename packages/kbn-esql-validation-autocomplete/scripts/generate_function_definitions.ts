/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readdirSync, readFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import _ from 'lodash';
import type { RecursivePartial } from '@kbn/utility-types';
import { FunctionDefinition, supportedFieldTypes } from '../src/definitions/types';

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

const evalSupportedCommandsAndOptions = {
  supportedCommands: ['stats', 'eval', 'where', 'row', 'sort'],
  supportedOptions: ['by'],
};

const excludedFunctions = new Set(['bucket', 'case']);

const extraFunctions: FunctionDefinition[] = [
  {
    type: 'eval',
    name: 'case',
    description:
      'Accepts pairs of conditions and values. The function returns the value that belongs to the first condition that evaluates to `true`. If the number of arguments is odd, the last argument is the default value which is returned when no condition matches.',
    ...evalSupportedCommandsAndOptions,
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

const elasticsearchToKibanaType = (elasticsearchType: string) => {
  if (
    [
      'double',
      'unsigned_long',
      'long',
      'integer',
      'counter_integer',
      'counter_long',
      'counter_double',
    ].includes(elasticsearchType)
  ) {
    return 'number';
  }

  if (['text', 'keyword'].includes(elasticsearchType)) {
    return 'string';
  }

  if (['datetime', 'time_duration'].includes(elasticsearchType)) {
    return 'date';
  }

  if (elasticsearchType === 'date_period') {
    return 'time_literal'; // TODO - consider aligning with Elasticsearch
  }

  return elasticsearchType;
};

const validateLogFunctions = `(fnDef: ESQLFunction) => {
  const messages = [];
  // do not really care here about the base and field
  // just need to check both values are not negative
  for (const arg of fnDef.args) {
    if (isLiteralItem(arg) && arg.value < 0) {
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
        params: [{ literalOptions: dateDiffOptions, literalSuggestions: dateDiffSuggestions }],
      },
    ],
  },
  date_extract: {
    signatures: [
      {
        // override the first param as type chrono_literal
        params: [{ type: 'chrono_literal' }],
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
    signatures: new Array(6).fill({
      params: [{}, { literalOptions: ['asc', 'desc'] }],
    }),
  },
  // can be removed when https://github.com/elastic/elasticsearch/issues/108982 is complete
  coalesce: {
    signatures: supportedFieldTypes
      .map<FunctionDefinition['signatures']>((type) => [
        {
          params: [
            {
              name: 'first',
              type,
              optional: false,
            },
          ],
          returnType: type,
          minParams: 1,
        },
        {
          params: [
            {
              name: 'first',
              type,
              optional: false,
            },
            {
              name: 'rest',
              type: 'boolean',
              optional: true,
            },
          ],
          returnType: type,
          minParams: 1,
        },
      ])
      .flat(),
  },
  // can be removed when https://github.com/elastic/elasticsearch/issues/108982 is complete
  mv_dedupe: {
    signatures: supportedFieldTypes.map<FunctionDefinition['signatures'][number]>((type) => ({
      params: [
        {
          name: 'field',
          type,
          optional: false,
        },
      ],
      returnType: type,
    })),
  },
};

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
      ? evalSupportedCommandsAndOptions
      : { supportedCommands: ['stats'] }),
    description: ESFunctionDefinition.description,
    alias: aliasTable[ESFunctionDefinition.name],
    signatures: _.uniqBy(
      ESFunctionDefinition.signatures.map((signature: any) => ({
        ...signature,
        params: signature.params.map((param: any) => ({
          ...param,
          type: elasticsearchToKibanaType(param.type),
          description: undefined,
        })),
        returnType: elasticsearchToKibanaType(signature.returnType),
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

function printGeneratedFunctionsFile(functionDefinitions: FunctionDefinition[]) {
  const removeInlineAsciiDocLinks = (asciidocString: string) => {
    const inlineLinkRegex = /\{.+?\}\/.+?\[(.+?)\]/g;
    return asciidocString.replace(inlineLinkRegex, '$1');
  };

  const getDefinitionName = (name: string) => _.camelCase(`${name}Definition`);

  const printFunctionDefinition = (functionDefinition: FunctionDefinition) => {
    const { type, name, description, alias, signatures } = functionDefinition;

    return `const ${getDefinitionName(name)}: FunctionDefinition = {
    type: '${type}',
    name: '${name}',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.${name}', { defaultMessage: ${JSON.stringify(
      removeInlineAsciiDocLinks(description)
    )} }),
    alias: ${alias ? `['${alias.join("', '")}']` : 'undefined'},
    signatures: ${JSON.stringify(signatures, null, 2)},
    supportedCommands: ${JSON.stringify(functionDefinition.supportedCommands)},
    supportedOptions: ${JSON.stringify(functionDefinition.supportedOptions)},
    validate: ${functionDefinition.validate || 'undefined'},
    examples: ${JSON.stringify(functionDefinition.examples || [])},
}`;
  };

  const fileHeader = `// NOTE: This file is generated by the generate_function_definitions.js script
// Do not edit it manually

import type { ESQLFunction } from '@kbn/esql-ast';
import { i18n } from '@kbn/i18n';
import { isLiteralItem } from '../shared/helpers';
import type { FunctionDefinition } from './types';


`;

  const functionDefinitionsString = functionDefinitions.map(printFunctionDefinition).join('\n\n');

  const fileContents = `${fileHeader}${functionDefinitionsString}
  export const evalFunctionDefinitions = [${functionDefinitions
    .map(({ name }) => getDefinitionName(name))
    .join(',\n')}];`;

  return fileContents;
}

(async function main() {
  const pathToElasticsearch = process.argv[2];

  const ESFunctionDefinitionsDirectory = join(
    __dirname,
    pathToElasticsearch,
    'docs/reference/esql/functions/kibana/definition'
  );

  // read all ES function definitions (the directory is full of JSON files) and create an array of definitions
  const ESFunctionDefinitions = readdirSync(ESFunctionDefinitionsDirectory).map((file) =>
    JSON.parse(readFileSync(`${ESFunctionDefinitionsDirectory}/${file}`, 'utf-8'))
  );

  const evalFunctionDefinitions: FunctionDefinition[] = [];
  // const aggFunctionDefinitions = [];
  for (const ESDefinition of ESFunctionDefinitions) {
    if (aliases.has(ESDefinition.name) || excludedFunctions.has(ESDefinition.name)) {
      continue;
    }

    const functionDefinition = getFunctionDefinition(ESDefinition);

    evalFunctionDefinitions.push(functionDefinition);
  }

  evalFunctionDefinitions.push(...extraFunctions);

  await writeFile(
    join(__dirname, '../src/definitions/functions.ts'),
    printGeneratedFunctionsFile(evalFunctionDefinitions)
  );
})();
