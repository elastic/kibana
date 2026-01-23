/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import { getConnectorIdSuggestionsItems } from './get_connector_id_suggestions_items';
import type { MonacoInsertPosition } from '../../../../../../entities/workflows/store';
import type { AutocompleteContext } from '../../context/autocomplete.types';

export function getConnectorIdSuggestions({
  line,
  lineParseResult,
  range,
  focusedStepInfo,
  dynamicConnectorTypes,
  position,
}: AutocompleteContext & { position?: monaco.Position }) {
  const stepConnectorType = focusedStepInfo?.stepType ?? null;

  if (
    !stepConnectorType ||
    !lineParseResult ||
    lineParseResult.matchType !== 'connector-id' ||
    !dynamicConnectorTypes
  ) {
    return [];
  }

  // Extract position from range if position is not provided
  const insertPosition: MonacoInsertPosition = position
    ? { lineNumber: position.lineNumber, column: position.column }
    : {
        lineNumber: range.startLineNumber,
        column:
          lineParseResult.fullKey !== '' ? lineParseResult.valueStartIndex + 1 : range.startColumn,
      };

  // If the user has typed part of the connector-id, we replace from the start of the value to the end of the line
  if (lineParseResult.fullKey !== '') {
    const replaceRange = {
      ...range,
      startColumn: lineParseResult.valueStartIndex + 1,
      endColumn: line.length + 1,
    };
    return getConnectorIdSuggestionsItems(
      stepConnectorType,
      replaceRange,
      dynamicConnectorTypes,
      insertPosition
    );
  }

  return getConnectorIdSuggestionsItems(
    stepConnectorType,
    range,
    dynamicConnectorTypes,
    insertPosition
  );
}
