/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildConstantsDefinitions } from '../../autocomplete/autocomplete_definitions';
import { AutocompleteCommandDefinition } from '../../autocomplete/types';
import { chronoLiterals, timeLiterals } from './literals';
import { CommandDefinition, CommandOptionsDefinition, FunctionDefinition } from './types';

export function getCommandOrOptionsSignature({
  name,
  signature,
  ...rest
}: CommandDefinition | CommandOptionsDefinition): string {
  const args = signature.params
    .map(({ name: argName, type }) => {
      return `<${argName}>`;
    })
    .join(' ');
  const optionArgs =
    'options' in rest ? rest.options.map(getCommandOrOptionsSignature).join(' ') : '';
  const signatureString = `${name.toUpperCase()} ${args}${
    signature.multipleParams ? `[, ${args}]` : ''
  }${optionArgs ? ' ' + optionArgs : ''}`;
  if ('wrapped' in rest && rest.wrapped) {
    return `${rest.wrapped[0]}${signatureString}${rest.wrapped[1]}${rest.optional ? '?' : ''}`;
  }
  return signatureString;
}

export function getFunctionSignatures(
  { name, signatures }: FunctionDefinition,
  { withTypes }: { withTypes: boolean } = { withTypes: true }
) {
  return signatures.map(({ params, returnType, infiniteParams, examples }) => ({
    declaration: `${name}(${params.map((arg) => printArguments(arg, withTypes)).join(', ')}${
      infiniteParams ? ` ,[... ${params.map((arg) => printArguments(arg, withTypes))}]` : ''
    })${withTypes ? `: ${returnType}` : ''}`,
    examples,
  }));
}

export function printArguments(
  {
    name,
    type,
    optional,
    reference,
  }: {
    name: string;
    type: string | string[];
    optional?: boolean;
    reference?: string;
  },
  withTypes: boolean
): string {
  if (!withTypes) {
    return name;
  }
  return `${name}${optional ? ':?' : ':'} ${Array.isArray(type) ? type.join(' | ') : type}`;
}

function getUnitDuration(unit: number = 1) {
  const filteredTimeLiteral = timeLiterals.filter(({ name }) => {
    const result = /s$/.test(name);
    return unit > 1 ? result : !result;
  });
  return filteredTimeLiteral.map(({ name }) => name);
}

export function getCompatibleLiterals(commandName: string, types: string[]) {
  const suggestions: AutocompleteCommandDefinition[] = [];
  if (types.includes('number') && commandName === 'limit') {
    // suggest 10/50/100
    suggestions.push(...buildConstantsDefinitions(['10', '100', '1000'], ''));
  }
  if (types.includes('time_literal')) {
    // filter plural for now and suggest only unit + singular

    suggestions.push(...buildConstantsDefinitions(getUnitDuration(1))); // i.e. 1 year
  }
  if (types.includes('chrono_literal')) {
    suggestions.push(...buildConstantsDefinitions(chronoLiterals.map(({ name }) => name))); // i.e. EPOC_DAY
  }
  return suggestions;
}
