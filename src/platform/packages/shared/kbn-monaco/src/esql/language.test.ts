/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PartialFieldsMetadataClient } from '@kbn/esql-validation-autocomplete/src/shared/types';
import { monaco } from '../monaco_imports';
import { ESQLLang } from './language';

describe('ESQLLang', () => {
  describe('getSuggestionProvider', () => {
    describe('resolveCompletionItem', () => {
      it('should resolve completion item with field metadata', async () => {
        const mockGetFieldsMetadata: Promise<PartialFieldsMetadataClient> = Promise.resolve({
          find: jest.fn().mockResolvedValue({
            fields: {
              'test.field': {
                type: 'keyword',
                description: 'Test field description',
              },
            },
          }),
        });

        const suggestionProvider = ESQLLang.getSuggestionProvider({
          getFieldsMetadata: mockGetFieldsMetadata,
        });

        const ecsItem: monaco.languages.CompletionItem = {
          label: 'test.field',
          kind: 4,
          insertText: 'test.field',
          range: new monaco.Range(0, 0, 0, 0),
        };

        const resolvedItem = await suggestionProvider.resolveCompletionItem!(ecsItem, {} as any);

        expect(resolvedItem).toEqual({
          ...ecsItem,
          documentation: {
            value: 'Test field description',
          },
        });

        const ecsItemWithKeywordSuffix: monaco.languages.CompletionItem = {
          label: 'test.field.keyword',
          kind: 4,
          insertText: 'test.field.keyword',
          range: new monaco.Range(0, 0, 0, 0),
        };

        const resolvedItemWithKeywordSuffix = await suggestionProvider.resolveCompletionItem!(
          ecsItemWithKeywordSuffix,
          {} as any
        );

        expect(resolvedItemWithKeywordSuffix).toEqual({
          ...ecsItemWithKeywordSuffix,
          documentation: {
            value: 'Test field description',
          },
        });
      });

      it('should return original item if field metadata is not available', async () => {
        const mockGetFieldsMetadata: Promise<PartialFieldsMetadataClient> = Promise.resolve({
          find: jest.fn().mockResolvedValue({
            fields: {},
          }),
        });

        const suggestionProvider = ESQLLang.getSuggestionProvider({
          getFieldsMetadata: mockGetFieldsMetadata,
        });

        const item: monaco.languages.CompletionItem = {
          label: 'test.field',
          kind: 4,
          insertText: 'test.field',
          range: new monaco.Range(0, 0, 0, 0),
        };
        const resolvedItem = await suggestionProvider.resolveCompletionItem!(item, {} as any);

        expect(resolvedItem).toEqual(item);
      });

      it('should never call metadata find API if not needed', async () => {
        const mockFind = jest.fn().mockResolvedValue({
          fields: {},
        });
        const mockGetFieldsMetadata: Promise<PartialFieldsMetadataClient> = Promise.resolve({
          find: mockFind,
        });

        const suggestionProvider = ESQLLang.getSuggestionProvider({
          getFieldsMetadata: mockGetFieldsMetadata,
        });

        const notFieldItem: monaco.languages.CompletionItem = {
          label: 'CASE',
          kind: 1,
          insertText: 'CASE',
          range: new monaco.Range(0, 0, 0, 0),
        };

        const notFieldResolvedItem = await suggestionProvider.resolveCompletionItem!(
          notFieldItem,
          {} as any
        );
        expect(mockFind).toBeCalledTimes(1);
        expect(notFieldResolvedItem).toEqual(notFieldItem);

        mockFind.mockClear();
        const notECSFieldItem: monaco.languages.CompletionItem = {
          label: 'not.ecs.field',
          kind: 4,
          insertText: 'not.ecs.field',
          range: new monaco.Range(0, 0, 0, 0),
        };
        const notECSFieldResolvedItem = await suggestionProvider.resolveCompletionItem!(
          notECSFieldItem,
          {} as any
        );
        expect(mockFind).toBeCalledTimes(1);
        expect(notECSFieldResolvedItem).toEqual(notECSFieldItem);
      });
    });
  });
});
