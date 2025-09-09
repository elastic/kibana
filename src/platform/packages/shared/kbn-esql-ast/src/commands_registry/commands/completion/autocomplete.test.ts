/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext, getMockCallbacks } from '../../../__tests__/context_fixtures';
import { autocomplete } from './autocomplete';
import { expectSuggestions, getFieldNamesByType } from '../../../__tests__/autocomplete';
import type { ICommandCallbacks } from '../../types';
import { Location } from '../../types';
import { getFunctionSuggestions } from '../../../definitions/utils';
import { ESQL_STRING_TYPES } from '../../../definitions/types';

const completionExpectSuggestions = (
  query: string,
  expectedSuggestions: string[],
  mockCallbacks?: ICommandCallbacks,
  context = mockContext
) => {
  return expectSuggestions(
    query,
    expectedSuggestions,
    context,
    'completion',
    mockCallbacks,
    autocomplete
  );
};

const PROMPT_SUGGESTIONS = [
  ' = ',
  ...getFieldNamesByType(ESQL_STRING_TYPES).map((v) => `${v} `),
  ...getFunctionSuggestions({
    location: Location.COMPLETION,
    returnTypes: ['text', 'keyword', 'unknown'],
  }).map((fn) => `${fn.text} `),
];

describe('COMPLETION Autocomplete', () => {
  let mockCallbacks: ICommandCallbacks;
  beforeEach(() => {
    jest.clearAllMocks();

    mockCallbacks = getMockCallbacks();

    const expectedFields = getFieldNamesByType(ESQL_STRING_TYPES);
    (mockCallbacks.getByType as jest.Mock).mockResolvedValue(
      expectedFields.map((name) => ({ label: name, text: name }))
    );
  });

  it('suggests PROMPT_SUGGESTIONS + default prompt after COMPLETION keyword', async () => {
    await completionExpectSuggestions(
      `FROM a | COMPLETION `,
      ['"${0:Your prompt to the LLM.}"', ...PROMPT_SUGGESTIONS],
      mockCallbacks
    );
  });

  it('suggests PROMPT_SUGGESTIONS when typing a column', async () => {
    await completionExpectSuggestions(
      `FROM a | COMPLETION kubernetes.some/`,
      PROMPT_SUGGESTIONS,
      mockCallbacks
    );
  });

  it('suggests ASSIGN after the user writes a new custom colum name', async () => {
    await completionExpectSuggestions(`FROM a | COMPLETION newColumn `, ['= ']);
  });

  it('suggests WITH after the user writes a colum name that already exists', async () => {
    await completionExpectSuggestions(`FROM a | COMPLETION textField `, ['WITH { $0 }']);
  });

  it('suggests WITH after the user writes a param as prompt', async () => {
    await completionExpectSuggestions(`FROM a | COMPLETION ? /`, ['WITH { $0 }']);
  });

  it('suggests WITH after the prompt', async () => {
    await completionExpectSuggestions(`FROM a | COMPLETION "prompt" /`, ['WITH { $0 }']);
    await completionExpectSuggestions(`FROM a | COMPLETION "prompt" WIT/`, ['WITH { $0 }']);
  });

  it('suggests inference_id parameter within the named parameters map', async () => {
    await completionExpectSuggestions(`FROM a | COMPLETION "prompt" WITH {`, [
      '"inference_id": "$0"',
    ]);
    await completionExpectSuggestions(`FROM a | COMPLETION "prompt" WITH { `, [
      '"inference_id": "$0"',
    ]);
    await completionExpectSuggestions(
      `FROM a | COMPLETION "prompt" WITH {
      `,
      ['"inference_id": "$0"']
    );
  });

  it('suggests inference endpoints as the values for inference_id', async () => {
    await completionExpectSuggestions(`FROM a | COMPLETION "prompt" WITH { "inference_id": "`, [
      'inference_1',
    ]);
    await completionExpectSuggestions(`FROM a | COMPLETION "prompt" WITH { "inference_id": "i/`, [
      'inference_1',
    ]);
    await completionExpectSuggestions(`FROM a | COMPLETION "prompt" WITH { "inference_id": "inf/`, [
      'inference_1',
    ]);
  });

  it('does not suggest anything if all the parameters are already provided', async () => {
    await completionExpectSuggestions(
      `FROM a | COMPLETION "prompt" WITH { "inference_id": "inference_1", `,
      []
    );
  });

  it('does not suggest anything if the parameter name is unsupported', async () => {
    await completionExpectSuggestions(
      `FROM a | COMPLETION "prompt" WITH { "unsupported_param": "`,
      []
    );
  });

  it('suggests pipe after complete command', async () => {
    await completionExpectSuggestions(
      `FROM a | COMPLETION "prompt" WITH { "inference_id": "inference_1" }`,
      ['| ']
    );
  });

  it('suggests pipe after incomplete but enclosed map expression', async () => {
    await completionExpectSuggestions(`FROM a | COMPLETION "prompt" WITH { "inference_id": "" }`, [
      '| ',
    ]);
    await completionExpectSuggestions(`FROM a | COMPLETION "prompt" WITH { "inference_id": "" } `, [
      '| ',
    ]);
  });
});
