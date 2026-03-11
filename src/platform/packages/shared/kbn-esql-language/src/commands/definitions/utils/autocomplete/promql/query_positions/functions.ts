/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ISuggestionItem } from '../../../../../registry/types';
import {
  PromQLFunctionDefinitionTypes,
  type PromQLFunctionDefinition,
  type PromQLFunctionParamType,
} from '../../../../types';
import { promqlFunctionDefinitions } from '../../../../generated/promql_functions';
import { buildFunctionDocumentation } from '../../../documentation';
import { withAutoSuggest } from '../../helpers';
import { SuggestionCategory } from '../../../../../../language/autocomplete/utils/sorting';
import { techPreviewLabel } from '../../../shared';

/** Returns function suggestions, optionally filtered by expected return types. */
export const suggestFunctions = (
  returnTypes: PromQLFunctionParamType[] = []
): ISuggestionItem[] => {
  if (!returnTypes.length) {
    return buildPromqlFunctionSuggestions();
  }

  return buildPromqlFunctionSuggestions((fn) =>
    fn.signatures.some((signature) => returnTypes.includes(signature.returnType))
  );
};

/** Builds readable signatures for PROMQL function documentation. */
const getPromqlFunctionDeclaration = (fn: PromQLFunctionDefinition) => {
  const { name, signatures } = fn;

  return signatures.map(({ params, returnType }) => ({
    declaration: `${name}(${params.map((param) => param.name).join(', ')})${
      returnType ? `: ${returnType}` : ''
    }`,
  }));
};

/** Converts one PROMQL function definition into an autocomplete suggestion. */
const getPromqlFunctionSuggestion = (fn: PromQLFunctionDefinition): ISuggestionItem => {
  const { description, examples, name, preview, signatures, type } = fn;
  const docDetail = preview ? `**[${techPreviewLabel}]** ${description}` : description;
  const hasNoArguments = signatures.every((signature) => signature.params.length === 0);

  // Aggregations insert just the name (e.g. `sum `) without parens: a follow-up prompt lets the user pick `<aggregation>` or `()`.
  let text: string;

  if (type === PromQLFunctionDefinitionTypes.ACROSS_SERIES) {
    text = `${name} `;
  } else if (hasNoArguments) {
    text = `${name}() `;
  } else {
    text = `${name}($0) `;
  }

  return {
    label: name,
    text,
    asSnippet: true,
    kind: 'Function',
    detail: description,
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

/** Builds the full list of PROMQL function suggestions, optionally pre-filtered by definition. */
const buildPromqlFunctionSuggestions = (
  predicate?: (fn: PromQLFunctionDefinition) => boolean
): ISuggestionItem[] => {
  let definitions = promqlFunctionDefinitions.filter(
    ({ ignoreAsSuggestion }) => !ignoreAsSuggestion
  );

  if (predicate) {
    definitions = definitions.filter(predicate);
  }

  return definitions.map((fn) => withAutoSuggest(getPromqlFunctionSuggestion(fn)));
};
