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
import {
  FunctionDefinition,
  FunctionDefinitionTypes,
  FunctionParameterType,
} from '../src/definitions/types';
import { Location } from '../src/commands_registry/types';
import { FULL_TEXT_SEARCH_FUNCTIONS } from '../src/definitions/constants';
import { mathValidators } from './validators';
import {
  aliasTable,
  aliases,
  defaultScalarFunctionLocations,
  defaultAggFunctionLocations,
  MATH_OPERATORS,
  COMPARISON_OPERATORS,
  mathOperatorsExtraSignatures,
  comparisonOperatorSignatures,
} from './constants';
import { extraFunctions, functionEnrichments, excludedFunctions } from './functions';

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
    locationsAvailable = [Location.WHERE, Location.STATS_WHERE];
  }

  if (ESFunctionDefinition.type === FunctionDefinitionTypes.TIME_SERIES_AGG) {
    locationsAvailable = [Location.STATS_TIMESERIES];
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
    const newOp = {
      ...op,
      locationsAvailable: [...op.locationsAvailable, Location.STATS_BY],
    };
    if (newOp.name === 'bucket') {
      const updatedSignatures = newOp.signatures.map((signature) => {
        const newSignature = { ...signature };
        if (newSignature.params && newSignature.params.length > 1) {
          const indicesToMakeConstantOnly = [1, 2, 3];

          newSignature.params = newSignature.params.map((param, index) => {
            const newParam = { ...param };
            if (indicesToMakeConstantOnly.includes(index)) {
              newParam.constantOnly = true;
            }
            return newParam;
          });
        }
        return newSignature;
      });
      newOp.signatures = updatedSignatures;
    }
    return newOp;
  });
};

const enrichOperators = (
  operatorsFunctionDefinitions: FunctionDefinition[]
): FunctionDefinition[] => {
  // @ts-expect-error Stringified version of the validator function
  return operatorsFunctionDefinitions.map((op) => {
    const isMathOperator = MATH_OPERATORS.includes(op.name);
    const isComparisonOperator = COMPARISON_OPERATORS.includes(op.name);

    // IS NULL | IS NOT NULL
    const arePredicates =
      op.operator?.toLowerCase() === 'is null' || op.operator?.toLowerCase() === 'is not null';

    const isInOperator = op.name === 'in' || op.name === 'not_in';
    const isLikeOperator = /like$/i.test(op.name);

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
        Location.COMPLETION,
      ]);
      // Adding comparison operator signatures for ip and version types
      signatures.push(...comparisonOperatorSignatures);
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
        Location.COMPLETION,
      ]);

      // taking care the `...EVAL col = @timestamp + 1 year` cases
      if (op.name === 'add' || op.name === 'sub') {
        signatures.push(...mathOperatorsExtraSignatures);
      }
    }
    if (isInOperator || isLikeOperator || arePredicates) {
      locationsAvailable = [
        Location.EVAL,
        Location.WHERE,
        Location.SORT,
        Location.ROW,
        Location.STATS_WHERE,
        Location.COMPLETION,
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

    return {
      ...op,
      signatures,
      // Elasticsearch docs does not include the full supported commands for math operators
      // so we are overriding to add proper support
      locationsAvailable,
      type: FunctionDefinitionTypes.OPERATOR,
      validate: mathValidators[op.name],
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
    description: i18n.translate('kbn-esql-ast.esql.definitions.${name}', { defaultMessage: ${JSON.stringify(
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
import { Location } from '../../commands_registry/types';
import { type FunctionDefinition, FunctionDefinitionTypes } from '../types';
${
  functionsType === FunctionDefinitionTypes.SCALAR
    ? `import type { ESQLFunction } from '../../types';
import { isLiteral } from '../../ast/is';;`
    : ''
}
${
  functionsType === FunctionDefinitionTypes.OPERATOR
    ? `import { isNumericType } from '../types';`
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
  export const ${_.camelCase(functionsType)}FunctionDefinitions = [${functionDefinitions
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

  const functionNames = allFunctionDefinitions.map((def) => def.name.toUpperCase());
  await writeFile(
    join(__dirname, '../src/definitions/generated/function_names.ts'),
    `/**
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

export const esqlFunctionNames = ${JSON.stringify(functionNames, null, 2)};
`
  );

  const scalarFunctionDefinitions: FunctionDefinition[] = [];
  const aggFunctionDefinitions: FunctionDefinition[] = [];
  const timeSeriesFunctionDefinitions: FunctionDefinition[] = [];
  const operatorDefinitions: FunctionDefinition[] = [];
  const groupingFunctionDefinitions: FunctionDefinition[] = [];

  for (const ESDefinition of allFunctionDefinitions) {
    if (aliases.has(ESDefinition.name) || excludedFunctions.has(ESDefinition.name)) {
      continue;
    }

    const functionDefinition = getFunctionDefinition(ESDefinition);
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

    if (functionDefinition.type === FunctionDefinitionTypes.OPERATOR) {
      operatorDefinitions.push(functionDefinition);
    }
    if (functionDefinition.type === FunctionDefinitionTypes.SCALAR) {
      scalarFunctionDefinitions.push(functionDefinition);
    } else if (functionDefinition.type === FunctionDefinitionTypes.AGG) {
      aggFunctionDefinitions.push(functionDefinition);
    } else if (functionDefinition.type === FunctionDefinitionTypes.GROUPING) {
      groupingFunctionDefinitions.push(functionDefinition);
    } else if (functionDefinition.type === FunctionDefinitionTypes.TIME_SERIES_AGG) {
      timeSeriesFunctionDefinitions.push(functionDefinition);
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
    join(__dirname, '../src/definitions/generated/time_series_agg_functions.ts'),
    printGeneratedFunctionsFile(
      timeSeriesFunctionDefinitions,
      FunctionDefinitionTypes.TIME_SERIES_AGG
    )
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
