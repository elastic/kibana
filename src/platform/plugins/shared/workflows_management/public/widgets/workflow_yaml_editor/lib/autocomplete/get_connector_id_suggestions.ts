/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AutocompleteContext } from './autocomplete.types';
import { getConnectorIdSuggestionsItems } from '../snippets/generate_connector_snippet';

export function getConnectorIdSuggestions(context: AutocompleteContext) {
  const { line, lineParseResult, range } = context;
  // Find the connector type for this step
  //   let stepConnectorType: string | null = getConnectorTypeFromContext(
  //     context.yamlDocument,
  //     path,
  //     model,
  //     position
  //   );

  // eslint-disable-next-line prefer-const
  let stepConnectorType = context.focusedStepInfo?.stepType ?? null;

  if (!stepConnectorType || !lineParseResult) {
    return [];
  }
  // For connector-id values, we replace from the start of the value to the end of the line
  // Find the position right after "connector-id: "
  const valueStartColumn = lineParseResult.match
    ? lineParseResult.match[1].length + 1
    : range.startColumn;
  const adjustedRange = {
    startLineNumber: range.startLineNumber,
    endLineNumber: range.endLineNumber,
    startColumn: valueStartColumn,
    endColumn: line.length + 1,
  };

  if (!context.dynamicConnectorTypes) {
    return [];
  }

  return getConnectorIdSuggestionsItems(
    stepConnectorType,
    adjustedRange,
    context.dynamicConnectorTypes
  );
}
