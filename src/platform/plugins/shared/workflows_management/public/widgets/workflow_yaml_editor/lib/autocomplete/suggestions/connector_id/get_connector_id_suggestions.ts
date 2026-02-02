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

  // Use position line number if available, otherwise fall back to range line number
  const lineNumber = position?.lineNumber ?? range.startLineNumber;

  // If the user has typed part of the connector-id, we replace from the start of the value to the end of the line
  if (lineParseResult.fullKey !== '') {
    const valueStartColumn = lineParseResult.valueStartIndex + 1;
    const replaceRange = {
      startLineNumber: lineNumber,
      endLineNumber: lineNumber,
      startColumn: valueStartColumn,
      endColumn: line.length + 1,
    };
    // Pass the insert position for the "Create connector" command
    const insertPosition: MonacoInsertPosition = {
      lineNumber,
      column: valueStartColumn,
    };
    return getConnectorIdSuggestionsItems(
      stepConnectorType,
      replaceRange,
      dynamicConnectorTypes,
      insertPosition
    );
  }

  // No existing value - use the range as-is
  const insertPosition: MonacoInsertPosition = {
    lineNumber,
    column: range.startColumn,
  };
  return getConnectorIdSuggestionsItems(
    stepConnectorType,
    range,
    dynamicConnectorTypes,
    insertPosition
  );
}
