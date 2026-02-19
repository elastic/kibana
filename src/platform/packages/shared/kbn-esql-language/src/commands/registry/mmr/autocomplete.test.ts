/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { mockContext, getMockCallbacks } from '../../../__tests__/commands/context_fixtures';
import { autocomplete } from './autocomplete';
import { onCompleteItem, pipeCompleteItem, withCompleteItem } from '../complete_items';
import { expectSuggestions, suggest } from '../../../__tests__/commands/autocomplete';
import type { ICommandCallbacks } from '../types';
import type { ESQLColumnData } from '../types';

const buildContextWithDenseVector = () => {
  const columns = new Map<string, ESQLColumnData>(mockContext.columns);
  columns.set('denseField', { name: 'denseField', type: 'dense_vector', userDefined: false });

  return {
    ...mockContext,
    columns,
  };
};

const expectMmrSuggestions = (
  query: string,
  expectedSuggestions: string[],
  mockCallbacks?: ICommandCallbacks,
  context = mockContext,
  offset?: number
) => {
  return expectSuggestions(
    query,
    expectedSuggestions,
    context,
    'mmr',
    mockCallbacks,
    autocomplete,
    offset
  );
};

describe('MMR Autocomplete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('suggests query vector and ON after MMR keyword', async () => {
    await expectMmrSuggestions('FROM a | MMR ', [
      '[${0:0.1}, ${1:0.2}]::dense_vector ',
      onCompleteItem.text,
    ]);
  });

  it('suggests ON after query vector', async () => {
    await expectMmrSuggestions('FROM a | MMR [0.1, 0.2]::dense_vector ', [onCompleteItem.text]);
  });

  it('suggests dense vector fields after ON', async () => {
    const context = buildContextWithDenseVector();
    const mockCallbacks = getMockCallbacks();
    (mockCallbacks.getByType as jest.Mock).mockResolvedValue([
      { label: 'denseField', text: 'denseField ' },
      { label: 'missingDense', text: 'missingDense ' },
    ]);

    await expectMmrSuggestions('FROM a | MMR ON ', ['denseField '], mockCallbacks, context);
  });

  it('suggests LIMIT after field', async () => {
    const context = buildContextWithDenseVector();
    await expectMmrSuggestions('FROM a | MMR ON denseField ', ['LIMIT '], undefined, context);
  });

  it('suggests limit value after LIMIT keyword', async () => {
    const context = buildContextWithDenseVector();
    await expectMmrSuggestions('FROM a | MMR ON denseField LIMIT ', ['10 '], undefined, context);
  });

  it('suggests WITH and pipe after limit value', async () => {
    const context = buildContextWithDenseVector();
    await expectMmrSuggestions(
      'FROM a | MMR ON denseField LIMIT 10 ',
      [withCompleteItem.text, pipeCompleteItem.text],
      undefined,
      context
    );
  });

  it('suggests lambda map after WITH keyword', async () => {
    const context = buildContextWithDenseVector();
    await expectMmrSuggestions(
      'FROM a | MMR ON denseField LIMIT 10 WITH ',
      ['{ "lambda": ${0:0.5} }'],
      undefined,
      context
    );
  });

  it('suggests lambda key inside options map', async () => {
    const context = buildContextWithDenseVector();
    const mockCallbacks = getMockCallbacks();

    const results = await suggest(
      'FROM a | MMR ON denseField LIMIT 10 WITH { ',
      context,
      'mmr',
      mockCallbacks,
      autocomplete
    );

    const texts = results.map((result) => result.text);
    expect(texts).toEqual(expect.arrayContaining(['"lambda": ']));
  });
});
