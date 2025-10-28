/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AutocompleteContext } from './autocomplete.types';
import { getConnectorTypeSuggestions } from './get_connector_type_suggestions';
import { getTriggerTypeSuggestions } from './get_trigger_type_suggestions';
import { isInTriggersContext } from './triggers_utils';

export function getDirectTypeSuggestions(autocompleteContext: AutocompleteContext) {
  const { line, lineUpToCursor, lineParseResult, range, path, dynamicConnectorTypes } =
    autocompleteContext;
  if (!lineParseResult || lineParseResult.matchType !== 'type') {
    return [];
  }

  const typePrefix = lineParseResult.match[1].replace(/['"]/g, '').trim();

  // For snippets, we need to replace from the start of the type value to the end of the line
  const typeValueStartColumn = lineUpToCursor.indexOf(lineParseResult.match[1]) + 1;
  const adjustedRange = {
    startLineNumber: range.startLineNumber,
    endLineNumber: range.endLineNumber,
    startColumn: typeValueStartColumn,
    endColumn: line.length + 1, // Go to end of line to allow multi-line insertion
  };

  // Detect context: are we in triggers or steps?

  if (isInTriggersContext(path)) {
    // We're in triggers context - suggest trigger types
    return getTriggerTypeSuggestions(typePrefix, adjustedRange);
  }
  // We're in steps context - suggest connector/step types
  if (!dynamicConnectorTypes) {
    return [];
  }
  return getConnectorTypeSuggestions(typePrefix, adjustedRange, dynamicConnectorTypes);
}
