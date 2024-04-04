/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { readdirSync, readFileSync } = require('fs');
const { writeFile } = require('fs/promises');
const join = require('path').join;
const _ = require('lodash');

const aliasTable = {
  to_version: ['to_ver'],
  to_unsigned_long: ['to_ul', 'to_ulong'],
  to_boolean: ['to_bool'],
  to_string: ['to_str'],
  to_datetime: ['to_dt'],
  to_double: ['to_dbl'],
  to_integer: ['to_int'],
};
const aliases = new Set(Object.values(aliasTable).flat());

const elasticsearchToKibanaType = (elasticsearchType) => {
  const numberType = ['double', 'unsigned_long', 'long', 'integer'];
  const stringType = ['text', 'keyword'];

  if (numberType.includes(elasticsearchType)) {
    return 'number';
  }

  if (stringType.includes(elasticsearchType)) {
    return 'string';
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

/**
 * Enrichments for function definitions
 *
 * This is the place to put information that is not reported by the `show functions` command
 * and, hence, won't be present in the JSON file.
 */
const functionEnrichments = {
  log10: {
    validate: validateLogFunctions,
  },
  log: {
    validate: validateLogFunctions,
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
  // TODO — reenable this when the signature is fixed on the ES side
  // auto_bucket: {
  //   signatures: new Array(4).fill({
  //     params: [{}, {}, { literalOnly: true }, { literalOnly: true }],
  //   }),
  // },
};

/**
 * Builds a function definition object from a row of the "meta functions" table
 * @param {Array<any>} value — the row of the "meta functions" table, corresponding to a single function definition
 * @param {*} columnIndices — the indices of the columns in the "meta functions" table
 * @returns
 */
function getFunctionDefinition(ESFunctionDefinition) {
  const ret = {
    type: ESFunctionDefinition.type,
    name: ESFunctionDefinition.name,
    ...(ESFunctionDefinition.type === 'eval'
      ? {
          supportedCommands: ['stats', 'eval', 'where', 'row'],
          supportedOptions: ['by'],
        }
      : { supportedCommands: ['stats'] }),
    description: ESFunctionDefinition.description,
    alias: aliasTable[ESFunctionDefinition.name],
    signatures: ESFunctionDefinition.signatures.map((signature) => ({
      ...signature,
      params: signature.params.map((param) => ({
        ...param,
        type: elasticsearchToKibanaType(param.type),
        description: undefined,
      })),
      returnType: elasticsearchToKibanaType(signature.returnType),
      // TODO compute minParams
      variadic: undefined,
    })),
  };

  if (functionEnrichments[ret.name]) {
    _.merge(ret, functionEnrichments[ret.name]);
  }

  return ret;
}

function printGeneratedFunctionsFile(functionDefinitions) {
  const removeInlineAsciiDocLinks = (asciidocString) => {
    const inlineLinkRegex = /\{.+?\}\/.+?\[(.+?)\]/g;
    return asciidocString.replace(inlineLinkRegex, '$1');
  };

  const printFunctionDefinition = (functionDefinition) => {
    const { type, name, description, alias, signatures } = functionDefinition;

    return `{
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
}`;
  };

  const fileHeader = `// NOTE: This file is generated by the generate_function_definitions.js script
// Do not edit it manually

import type { ESQLFunction } from '@kbn/esql-ast';
import { i18n } from '@kbn/i18n';
import { isLiteralItem } from '../shared/helpers';
import type { FunctionDefinition } from './types';


`;

  const functionDefinitionsString = functionDefinitions.map(printFunctionDefinition).join(',\n');

  const fileContents = `${fileHeader}export const functionDefinitions: FunctionDefinition[] = [\n${functionDefinitionsString}\n];`;

  return fileContents;
}

(async function main() {
  const ESFunctionDefinitionsDirectory = join(
    __dirname,
    '../../../../elasticsearch/docs/reference/esql/functions/kibana/definition'
  );

  // read all ES function definitions (the directory is full of JSON files) and create an array of definitions
  const ESFunctionDefinitions = readdirSync(ESFunctionDefinitionsDirectory).map((file) =>
    JSON.parse(readFileSync(`${ESFunctionDefinitionsDirectory}/${file}`, 'utf-8'))
  );

  const evalFunctionDefinitions = [];
  // const aggFunctionDefinitions = [];
  for (const ESDefinition of ESFunctionDefinitions) {
    if (aliases.has(ESDefinition.name)) {
      continue;
    }

    const functionDefinition = getFunctionDefinition(ESDefinition);

    evalFunctionDefinitions.push(functionDefinition);
  }

  await writeFile(
    join(__dirname, 'functions.ts'),
    printGeneratedFunctionsFile(evalFunctionDefinitions)
  );

  // await writeFile(
  //   join(__dirname, 'agg_functions_generated.ts'),
  //   printGeneratedFunctionsFile(aggFunctionDefinitions)
  // );
})();
