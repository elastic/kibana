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
  onCompleteItem,
  withCompleteItem,
  withMapCompleteItem,
  pipeCompleteItem,
  newLineCompleteItem,
  commaCompleteItem,
  assignCompletionItem,
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

    test('suggests a target column name, to open the `target = field` form', async () => {
      (mockCallbacks.getSuggestedUserDefinedColumnName as jest.Mock).mockReturnValue('col0');

      await expectDenseVectorSuggestions(
        'from a | dense_vector ',
        { contains: ['col0 = '] },
        mockCallbacks
      );
    });

    test('suggests the assignment operator after an unrecognized first name', async () => {
      await expectDenseVectorSuggestions(
        'from a | dense_vector vec',
        { contains: [assignCompletionItem.text] },
        mockCallbacks
      );
    });

    test('does not suggest a target assignment after a comma, where the grammar rejects it', async () => {
      (mockCallbacks.getSuggestedUserDefinedColumnName as jest.Mock).mockReturnValue('col0');

      await expectDenseVectorSuggestions(
        'from a | dense_vector textField, ',
        { contains: ['keywordField'], notContains: ['col0 = '] },
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

  describe('target = field form', () => {
    test('suggests fields, but no further target, inside the assignment', async () => {
      (mockCallbacks.getSuggestedUserDefinedColumnName as jest.Mock).mockReturnValue('col0');

      await expectDenseVectorSuggestions(
        'from a | dense_vector vec = ',
        {
          contains: ['textField', 'keywordField'],
          notContains: ['integerField', 'col0 = '],
        },
        mockCallbacks
      );
    });

    test('suggests continuations after the assigned field', async () => {
      await expectDenseVectorSuggestions(
        'from a | dense_vector vec = textField ',
        [newLineCompleteItem.text, pipeCompleteItem.text, ', ', withCompleteItem.text],
        mockCallbacks
      );
    });
  });

  describe('suffix = "..." ON form', () => {
    test('suggests the suffix modifier right after the command keyword', async () => {
      await expectDenseVectorSuggestions(
        'from a | dense_vector ',
        { contains: ['suffix = "${0:_dense_vector}" ON '] },
        mockCallbacks
      );
    });

    test('does not suggest the suffix modifier once a field is being typed', async () => {
      await expectDenseVectorSuggestions(
        'from a | dense_vector textField, ',
        { notContains: ['suffix = "${0:_dense_vector}" ON '] },
        mockCallbacks
      );
    });

    // Until ON is typed, `suffix = "_dv"` is indistinguishable from the literal-input form,
    // so ON has to stay on offer here.
    test('suggests ON after a quoted value assigned to a name', async () => {
      await expectDenseVectorSuggestions(
        'from a | dense_vector suffix = "_dv" ',
        [
          onCompleteItem.text,
          withCompleteItem.text,
          newLineCompleteItem.text,
          pipeCompleteItem.text,
        ],
        mockCallbacks
      );
    });

    test('suggests text and keyword fields after ON', async () => {
      await expectDenseVectorSuggestions(
        'from a | dense_vector suffix = "_dv" ON ',
        {
          contains: ['textField', 'keywordField'],
          notContains: ['integerField'],
        },
        mockCallbacks
      );
    });

    test('does not suggest a target assignment in the ON list', async () => {
      (mockCallbacks.getSuggestedUserDefinedColumnName as jest.Mock).mockReturnValue('col0');

      await expectDenseVectorSuggestions(
        'from a | dense_vector suffix = "_dv" ON ',
        { notContains: ['col0 = '] },
        mockCallbacks
      );
    });

    test('suggests continuations after a field in the ON list', async () => {
      await expectDenseVectorSuggestions(
        'from a | dense_vector suffix = "_dv" ON textField ',
        [newLineCompleteItem.text, pipeCompleteItem.text, ', ', withCompleteItem.text],
        mockCallbacks
      );
    });
  });

  describe('string literal input', () => {
    // `DENSE_VECTOR "text" ON field` is a syntax error, so ON must not be offered here.
    test('suggests only WITH and pipe after a bare literal', async () => {
      await expectDenseVectorSuggestions(
        'from a | dense_vector "some text" ',
        [withCompleteItem.text, newLineCompleteItem.text, pipeCompleteItem.text],
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
