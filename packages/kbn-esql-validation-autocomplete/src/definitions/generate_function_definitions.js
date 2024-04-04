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

/**
 * Builds a function definition object from a row of the "meta functions" table
 * @param {Array<any>} value — the row of the "meta functions" table, corresponding to a single function definition
 * @param {*} columnIndices — the indices of the columns in the "meta functions" table
 * @returns
 */
function getFunctionDefinition(ESFunctionDefinition) {
  return {
    type: ESFunctionDefinition.type,
    name: ESFunctionDefinition.name,
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
}`;
  };

  const functionDefinitionsString = functionDefinitions.map(printFunctionDefinition).join(',\n');

  const fileContents = `import { i18n } from '@kbn/i18n';
import type { GeneratedFunctionDefinition } from './types';

export const generatedFunctions: GeneratedFunctionDefinition[] = [\n${functionDefinitionsString}\n];`;

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
    join(__dirname, 'eval_functions_generated.ts'),
    printGeneratedFunctionsFile(evalFunctionDefinitions)
  );

  // await writeFile(
  //   join(__dirname, 'agg_functions_generated.ts'),
  //   printGeneratedFunctionsFile(aggFunctionDefinitions)
  // );
})();
