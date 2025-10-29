/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getConnectorIdSuggestions } from './get_connector_id_suggestions';
import type { AutocompleteContext } from '../autocomplete.types';

describe('getConnectorIdSuggestions', () => {
  it('should return an empty array if the line parse result is null', () => {
    const result = getConnectorIdSuggestions({
      line: '',
      lineParseResult: null,
      range: { startLineNumber: 1, endLineNumber: 1, startColumn: 1, endColumn: 1 },
      focusedStepInfo: null,
      dynamicConnectorTypes: null,
    } as AutocompleteContext);
    expect(result).toEqual([]);
  });
});
