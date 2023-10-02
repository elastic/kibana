/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { monaco } from '../../../../monaco_imports';
import { buildDocumentation, buildFunctionDocumentation } from './utils';

import type { AutocompleteCommandDefinition } from '../types';
import { evalFunctionsDefinitions } from '../../ast/definitions/functions';
import { getFunctionSignatures } from '../../ast/definitions/helpers';
import { FunctionDefinition } from '../../ast/definitions/types';
import { statsAggregationFunctionDefinitions } from '../../ast/definitions/aggs';

export const whereCommandDefinition: AutocompleteCommandDefinition[] = [
  {
    label: 'cidr_match',
    insertText: 'cidr_match',
    kind: 1,
    detail: i18n.translate('monaco.esql.autocomplete.cidrMatchDoc', {
      defaultMessage:
        'The function takes a first parameter of type IP, followed by one or more parameters evaluated to a CIDR specificatione.',
    }),
    documentation: {
      value: buildDocumentation('cidr_match(grouped[T]): aggregated[T]', [
        'from index | eval cidr="10.0.0.0/8" | where cidr_match(ip_field, "127.0.0.1/30", cidr)',
      ]),
    },
    sortText: 'C',
  },
];

function getAutocompleteFunctionDefinition(fn: FunctionDefinition) {
  const fullSignatures = getFunctionSignatures(fn);
  return {
    label: fullSignatures[0].declaration,
    insertText: `${fn.name}($0)`,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: 1,
    detail: fn.description,
    documentation: {
      value: buildFunctionDocumentation(fullSignatures),
    },
    sortText: 'C',
  };
}

export const mathCommandDefinition: AutocompleteCommandDefinition[] = evalFunctionsDefinitions.map(
  getAutocompleteFunctionDefinition
);

const allFunctions = statsAggregationFunctionDefinitions.concat(evalFunctionsDefinitions);

export const aggregationFunctionsDefinitions: AutocompleteCommandDefinition[] =
  statsAggregationFunctionDefinitions.map(getAutocompleteFunctionDefinition);

export const getCompatibleFunctionDefinition = (
  command: string,
  returnTypes?: string[]
): AutocompleteCommandDefinition[] => {
  const fnSupportedByCommand = allFunctions.filter(({ supportedCommands }) =>
    supportedCommands.includes(command)
  );
  if (!returnTypes) {
    return fnSupportedByCommand.map(getAutocompleteFunctionDefinition);
  }
  return fnSupportedByCommand
    .filter((mathDefinition) =>
      mathDefinition.signatures.some(
        (signature) => returnTypes[0] === 'any' || returnTypes.includes(signature.returnType)
      )
    )
    .map(getAutocompleteFunctionDefinition);
};
