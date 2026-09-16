/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  mockContext,
  lookupIndexFields,
  getMockCallbacks,
} from '../../../__tests__/commands/context_fixtures';
import { autocomplete } from './autocomplete';
import {
  withCompleteItem,
  withMapCompleteItem,
  pipeCompleteItem,
  newLineCompleteItem,
  commaCompleteItem,
} from '../complete_items';
import { expectSuggestions, suggest } from '../../../__tests__/commands/autocomplete';
import type { ICommandCallbacks } from '../types';

type ExpectedSuggestions = string[] | { contains?: string[]; notContains?: string[] };

const expectDenseVectorSuggestions = async (
  query: string,
  expected: ExpectedSuggestions,
  mockCallbacks?: ICommandCallbacks,
  context = mockContext,
  offset?: number
): Promise<void> => {
  if (Array.isArray(expected)) {
    return expectSuggestions(
      query,
      expected,
      context,
      'dense_vector',
      mockCallbacks,
      autocomplete,
      offset
    );
  }

  const results = await suggest(
    query,
    context,
    'dense_vector',
    mockCallbacks,
    autocomplete,
    offset
  );
  const texts = results.map((r) => r.text);

  if (expected.contains?.length) {
    expect(texts).toEqual(expect.arrayContaining(expected.contains));
  }

  // Assert per item: `not.toEqual(arrayContaining([...]))` only fails when *every* listed
  // suggestion is present, so it would let a partial regression through.
  expected.notContains?.forEach((text) => {
    expect(texts).not.toContain(text);
  });
};

describe('DENSE_VECTOR Autocomplete', () => {
  let mockCallbacks: ICommandCallbacks;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallbacks = getMockCallbacks();
    (mockCallbacks.getColumnsForQuery as jest.Mock).mockResolvedValue([...lookupIndexFields]);
  });

  describe('field list', () => {
    test('suggests text and keyword fields after the command keyword', async () => {
      await expectDenseVectorSuggestions(
        'from a | dense_vector ',
        {
          contains: ['textField', 'keywordField'],
          notContains: ['integerField'],
        },
        mockCallbacks
      );
    });

    test('does not suggest a new user-defined column, since assignments are not allowed', async () => {
      await expectDenseVectorSuggestions(
        'from a | dense_vector ',
        { notContains: ['col0 = '] },
        mockCallbacks
      );
    });

    test('suggests continuations after a complete field', async () => {
      await expectDenseVectorSuggestions(
        'from a | dense_vector keywordField',
        {
          contains: [
            commaCompleteItem.text.endsWith(' ')
              ? commaCompleteItem.text
              : `${commaCompleteItem.text} `,
            withCompleteItem.text,
            pipeCompleteItem.text,
            'textField',
          ],
        },
        mockCallbacks
      );
    });

    test('suggests more fields after a comma', async () => {
      await expectDenseVectorSuggestions(
        'from a | dense_vector textField, ',
        {
          contains: ['keywordField'],
          notContains: ['integerField'],
        },
        mockCallbacks
      );
    });
  });

  describe('WITH clause', () => {
    test('suggests the map opener once WITH is typed', async () => {
      await expectDenseVectorSuggestions(
        'from a | dense_vector textField WITH ',
        [withMapCompleteItem.text],
        mockCallbacks
      );
    });

    test('suggests parameter keys inside an empty map', async () => {
      await expectDenseVectorSuggestions(
        'from a | dense_vector textField WITH { ',
        ['"inference_id": "$0"', '"timeout": "$0"'],
        mockCallbacks
      );
    });

    test('does not suggest an already-used parameter key after a comma', async () => {
      await expectDenseVectorSuggestions(
        'from a | dense_vector textField WITH { "inference_id": "inference_1", ',
        {
          contains: ['"timeout": "$0"'],
          notContains: ['"inference_id": "$0"'],
        },
        mockCallbacks
      );
    });

    test('suggests the available inference endpoints as inference_id values', async () => {
      await expectDenseVectorSuggestions(
        'from a | dense_vector textField WITH { "inference_id": "',
        ['"inference_1"'],
        mockCallbacks
      );
    });

    test('suggests a default duration as the timeout value', async () => {
      await expectDenseVectorSuggestions(
        'from a | dense_vector textField WITH { "timeout": "',
        ['"30s"'],
        mockCallbacks
      );
    });

    test('does not suggest values for an unsupported parameter', async () => {
      await expectDenseVectorSuggestions(
        'from a | dense_vector textField WITH { "unsupported_param": "',
        [],
        mockCallbacks
      );
    });

    test('suggests only pipe and newline after a complete map', async () => {
      await expectDenseVectorSuggestions(
        'from a | dense_vector textField WITH { "inference_id": "inference_1" } ',
        [newLineCompleteItem.text, pipeCompleteItem.text],
        mockCallbacks
      );
    });
  });
});
