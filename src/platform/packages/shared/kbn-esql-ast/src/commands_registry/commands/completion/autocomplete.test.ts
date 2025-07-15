/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext } from '../../../__tests__/context_fixtures';
import { autocomplete } from './autocomplete';
import { expectSuggestions, getFieldNamesByType } from '../../../__tests__/autocomplete';
import { ICommandCallbacks, Location } from '../../types';
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('suggests PROMPT_SUGGESTIONS + default prompt after COMPLETION keyword', async () => {
    await completionExpectSuggestions(`FROM a | COMPLETION `, [
      '"${0:Your prompt to the LLM.}"',
      ...PROMPT_SUGGESTIONS,
    ]);
  });

  it('suggests PROMPT_SUGGESTIONS when typing a column', async () => {
    await completionExpectSuggestions(`FROM a | COMPLETION kubernetes.some/`, PROMPT_SUGGESTIONS);
  });

  it('suggests ASSIGN after the user writes a new custom colum name', async () => {
    await completionExpectSuggestions(`FROM a | COMPLETION newColumn `, ['= ']);
  });

  it('suggests WITH after the user writes a colum name that already exists', async () => {
    await completionExpectSuggestions(`FROM a | COMPLETION textField `, ['WITH ']);
  });

  it('suggests WITH after the user writes a param as prompt', async () => {
    await completionExpectSuggestions(`FROM a | COMPLETION ? /`, ['WITH ']);
  });

  it('suggests WITH after the prompt', async () => {
    await completionExpectSuggestions(`FROM a | COMPLETION "prompt" /`, ['WITH ']);
    await completionExpectSuggestions(`FROM a | COMPLETION "prompt" WIT/`, ['WITH ']);
  });

  it('suggests inference endpoints after WITH', async () => {
    await completionExpectSuggestions(`FROM a | COMPLETION "prompt" WITH `, ['`inference_1` ']);
  });

  it('suggests pipe after complete command', async () => {
    await completionExpectSuggestions(
      `FROM a | COMPLETION "prompt" WITH inferenceId AS completion /`,
      ['| ']
    );
  });
});
