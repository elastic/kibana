/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import type { ConnectorTypeInfo } from '@kbn/workflows';
import { z } from '@kbn/zod';
import * as generateConnectorSnippetModule from '../../snippets/generate_connector_snippet';
import { getFakeAutocompleteContextParams } from '../context/build_autocomplete_context.test';
import { getCompletionItemProvider } from '../get_completion_item_provider';
import * as getConnectorWithSchemaModule from '../suggestions/connector_with/get_connector_with_schema';
import * as getExistingParametersModule from '../suggestions/connector_with/get_existing_parameters_in_with_block';
import * as getWithBlockSuggestionsModule from '../suggestions/connector_with/get_with_block_suggestions';

// Mock the modules
jest.mock('../suggestions/connector_with/get_with_block_suggestions');
jest.mock('../suggestions/connector_with/get_connector_with_schema');
jest.mock('../suggestions/connector_with/get_existing_parameters_in_with_block');
jest.mock('../../snippets/generate_connector_snippet');

async function getSuggestions(
  yamlContent: string,
  connectorTypes?: Record<string, ConnectorTypeInfo>
): Promise<monaco.languages.CompletionItem[]> {
  const fakeAutocompleteContextParams = getFakeAutocompleteContextParams(
    yamlContent,
    connectorTypes
  );
  const completionProvider = getCompletionItemProvider(
    () => fakeAutocompleteContextParams.editorState
  );

  const result = await completionProvider.provideCompletionItems(
    fakeAutocompleteContextParams.model,
    fakeAutocompleteContextParams.position,
    fakeAutocompleteContextParams.completionContext,
    {
      isCancellationRequested: false,
      onCancellationRequested: () => ({
        dispose: () => {},
      }),
    }
  );

  return result?.suggestions ?? [];
}

describe('getCompletionItemProvider - Sanity tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all mocks to their default implementations
    jest.mocked(getWithBlockSuggestionsModule.getWithBlockSuggestions).mockReturnValue([]);
    jest.mocked(getConnectorWithSchemaModule.getConnectorParamsSchema).mockReturnValue(null);
    jest
      .mocked(getExistingParametersModule.getExistingParametersInWithBlock)
      .mockReturnValue(new Set());
    jest.mocked(generateConnectorSnippetModule.getEnhancedTypeInfo).mockImplementation((schema) => {
      // Basic type info implementation
      if (schema instanceof z.ZodString) {
        return {
          type: 'string',
          isRequired: false,
          isOptional: true,
          description: undefined,
          example: undefined,
        };
      } else if (schema instanceof z.ZodNumber) {
        return {
          type: 'number',
          isRequired: false,
          isOptional: true,
          description: undefined,
          example: undefined,
        };
      } else if (schema instanceof z.ZodBoolean) {
        return {
          type: 'boolean',
          isRequired: false,
          isOptional: true,
          description: undefined,
          example: undefined,
        };
      } else if (schema instanceof z.ZodObject) {
        return {
          type: 'object',
          isRequired: false,
          isOptional: true,
          description: undefined,
          example: undefined,
        };
      } else if (schema instanceof z.ZodArray) {
        return {
          type: 'string[]',
          isRequired: false,
          isOptional: true,
          description: undefined,
          example: undefined,
        };
      }
      return {
        type: 'unknown',
        isRequired: false,
        isOptional: true,
        description: undefined,
        example: undefined,
      };
    });
  });

  // This file is for any remaining tests that don't fit into the other categories
  // Currently empty as all tests have been distributed to the appropriate files
});
