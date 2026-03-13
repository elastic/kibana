/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ISuggestionItem } from '../../../../../registry/types';
import { type PromQLFunctionDefinition } from '../../../../types';
import { promqlOperatorDefinitions } from '../../../../generated/promql_operators';
import { buildFunctionDocumentation } from '../../../documentation';
import { techPreviewLabel } from '../../../shared';
import { arithmeticOperators } from '../../../../all_operators';

/** Returns operator suggestions available in query continuation contexts. */
export const suggestOperators = (): ISuggestionItem[] => {
  return promqlOperatorDefinitions
    .filter(({ operator, name, ignoreAsSuggestion, signatures }) => {
      const symbol = operator ?? name;

      return (
        !ignoreAsSuggestion &&
        signatures.some(({ params }) => params.length >= 2) &&
        (arithmeticOperators.some(({ name: opName }) => opName === symbol) || symbol === '^')
      );
    })
    .map((op) => buildPromqlSymbolSuggestion(op));
};

/** Converts an operator definition into an autocomplete suggestion item. */
const buildPromqlSymbolSuggestion = (definition: PromQLFunctionDefinition): ISuggestionItem => {
  const { description, examples, operator, name, preview } = definition;
  const docDetail = preview ? `**[${techPreviewLabel}]** ${description}` : description;
  const symbol = operator ?? name;

  return {
    label: symbol,
    text: `${symbol} `,
    asSnippet: false,
    kind: 'Operator',
    detail: description,
    documentation: {
      value: buildFunctionDocumentation(docDetail, [], examples),
    },
  };
};
