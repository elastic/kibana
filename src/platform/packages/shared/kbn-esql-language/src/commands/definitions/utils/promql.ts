/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ISuggestionItem } from '../../registry/types';
import type { ESQLAstPromqlCommand, ESQLMapEntry } from '../../../types';
import { PromQLFunctionDefinitionTypes, type PromQLFunctionDefinition } from '../types';
import { promqlFunctionDefinitions } from '../generated/promql_functions';
import { buildFunctionDocumentation } from './documentation';
import { withAutoSuggest } from './autocomplete/helpers';
import { isIdentifier, isSource } from '../../../ast/is';
import { SuggestionCategory } from '../../../shared/sorting';
import { techPreviewLabel } from './shared';

const INDEX_PARAM_REGEX = /\bindex\s*=\s*(\S+)/i;

/* Builds readable signatures for PROMQL functions. */
const getPromqlFunctionDeclaration = (fn: PromQLFunctionDefinition) => {
  const { name, signatures } = fn;

  return signatures.map(({ params, returnType }) => ({
    declaration: `${name}(${params.map((param) => param.name).join(', ')})${
      returnType ? `: ${returnType}` : ''
    }`,
  }));
};

/* Converts a PROMQL function definition into an autocomplete suggestion. */
const getPromqlFunctionSuggestion = (fn: PromQLFunctionDefinition): ISuggestionItem => {
  const { description, examples, name, preview, signatures } = fn;
  const detail = description;
  const docDetail = preview ? `**[${techPreviewLabel}]** ${detail}` : detail;

  const hasNoArguments = signatures.every((signature) => signature.params.length === 0);
  const text = hasNoArguments ? `${name}() ` : `${name}($0) `;

  return {
    label: name,
    text,
    asSnippet: true,
    kind: 'Function',
    detail,
    category: SuggestionCategory.FUNCTION_AGG,
    documentation: {
      value: buildFunctionDocumentation(docDetail, getPromqlFunctionDeclaration(fn), examples),
    },
    command: {
      id: 'editor.action.triggerParameterHints',
      title: '',
    },
  };
};

/* Returns all PROMQL function suggestions suitable for autocomplete. */
export const getPromqlFunctionSuggestions = (): ISuggestionItem[] => {
  return promqlFunctionDefinitions
    .filter((fn) => !fn.ignoreAsSuggestion)
    .map((fn) => withAutoSuggest(getPromqlFunctionSuggestion(fn)));
};

/* Reports whether a PromQL function is an across-series aggregation. */
export const isPromqlAcrossSeriesFunction = (name: string): boolean => {
  const normalized = name.toLowerCase();

  return promqlFunctionDefinitions.some(
    ({ name: fnName, type }) =>
      fnName.toLowerCase() === normalized &&
      type === PromQLFunctionDefinitionTypes.PROMQL_ACROSS_SERIES
  );
};

export function getIndexFromPromQLParams({
  params,
  query,
}: ESQLAstPromqlCommand): string | undefined {
  if (params?.entries) {
    const indexEntry = params.entries.find(
      (entry): entry is ESQLMapEntry =>
        isIdentifier(entry.key) && entry.key.name.toLowerCase() === 'index'
    );

    const { value } = indexEntry ?? {};

    if (isIdentifier(value) || isSource(value)) {
      return value.name;
    }
  }

  // Fallback: when "index=value" is last token, parser puts it in query.text
  // Needed by autocomplete and external consumers (e.g. getIndexPatternFromESQLQuery).
  const indexMatch = query?.text?.match(INDEX_PARAM_REGEX);

  return indexMatch?.[1];
}
