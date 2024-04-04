/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { writeFile, readFile } = require('fs/promises');
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

/**
 * Report the possible combinations of parameter types for a function
 *
 * For example, given
 *
 * [
 *  { name: 'a', type: ['number', 'string'], optional: true },
 *  { name: 'b', type: ['number', 'boolean'] }
 * ]
 *
 * this function will return
 * [
 *   [
 *    { name: 'a', type: 'number', optional: true },
 *    { name: 'b', type: 'number' }
 *  ],
 *  [
 *    { name: 'a', type: 'number', optional: true },
 *    { name: 'b', type: 'boolean' }
 *  ],
 *  [
 *    { name: 'a', type: 'string', optional: true },
 *    { name: 'b', type: 'number' }
 *  ],
 *  [
 *    { name: 'a', type: 'string', optional: true },
 *    { name: 'b', type: 'boolean' }
 *  ]
 * ]
 */
function expandParams(params) {
  let result = [[]];

  params.forEach((param) => {
    const temp = [];
    result.forEach((res) => {
      param.type.forEach((type) => {
        temp.push([...res, { ...param, type }]);
      });
    });
    result = temp;
  });

  return result;
}

const ensureArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  } else {
    return value === null ? [] : [value];
  }
};

const dedupe = (arr) => Array.from(new Set(arr));

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
function getFunctionDefinition(value, columnIndices) {
  const kbnArgTypes = ensureArray(value[columnIndices.argTypes]).map((argType) =>
    dedupe(argType.split('|').map(elasticsearchToKibanaType))
  );

  const getMinParams = () =>
    value[columnIndices.variadic]
      ? ensureArray(value[columnIndices.optionalArgs]).length
      : undefined;

  const getReturnType = () => {
    const allReturnTypes = dedupe(
      value[columnIndices.returnType].split('|').map(elasticsearchToKibanaType)
    );

    // our client-side parser doesn't currently support multiple return types
    return allReturnTypes.length === 1 ? allReturnTypes[0] : 'any';
  };

  const unexpandedParams = ensureArray(value[columnIndices.argNames]).map((argName, i) => ({
    name: argName,
    type: kbnArgTypes[i],
    optional: ensureArray(value[columnIndices.optionalArgs])[i],
  }));

  const expandedParams = expandParams(unexpandedParams);

  const signatures = expandedParams.map((params) => ({
    params,
    returnType: getReturnType(),
    minParams: getMinParams(),
  }));

  return {
    type: value[columnIndices.isAggregation] ? 'agg' : 'eval',
    name: value[columnIndices.name],
    description: value[columnIndices.description],
    alias: aliasTable[value[columnIndices.name]],
    signatures,
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
  const showFunctionsOutput = JSON.parse(
    await readFile(join(__dirname, 'meta_functions_output.json'), 'utf8')
  );

  const columnIndices = showFunctionsOutput.columns.reduce((acc, curr, index) => {
    acc[curr.name] = index;
    return acc;
  }, {});

  const evalFunctionDefinitions = [];
  const aggFunctionDefinitions = [];
  for (const value of showFunctionsOutput.values) {
    if (aliases.has(value[columnIndices.name])) {
      continue;
    }

    const functionDefinition = getFunctionDefinition(value, columnIndices);

    functionDefinition.type === 'agg'
      ? aggFunctionDefinitions.push(functionDefinition)
      : evalFunctionDefinitions.push(functionDefinition);
  }

  await writeFile(
    join(__dirname, 'eval_functions_generated.ts'),
    printGeneratedFunctionsFile(evalFunctionDefinitions)
  );

  await writeFile(
    join(__dirname, 'agg_functions_generated.ts'),
    printGeneratedFunctionsFile(aggFunctionDefinitions)
  );
})();
