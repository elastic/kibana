/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { of } from 'rxjs';
import { useGenAiData } from './use_genai_data';
import { getUnifiedDocViewerServices } from '../../../../plugin';

jest.mock('../../../../plugin', () => ({
  getUnifiedDocViewerServices: jest.fn(),
}));

const INPUT_MESSAGES_FIELD = 'attributes.gen_ai.input.messages';
const mockSearch = jest.fn();

(getUnifiedDocViewerServices as jest.Mock).mockReturnValue({
  data: {
    search: {
      search: mockSearch,
    },
  },
});

function buildHit({
  flattened = {},
  _source,
  _ignored,
  _id = 'doc-1',
  _index = 'traces-otel',
}: {
  flattened?: Record<string, unknown>;
  _source?: Record<string, unknown>;
  _ignored?: string[];
  _id?: string;
  _index?: string;
}): DataTableRecord {
  return {
    id: _id,
    raw: { _id, _index, _source, _ignored },
    flattened,
  } as unknown as DataTableRecord;
}

describe('useGenAiData', () => {
  beforeEach(() => {
    mockSearch.mockReset();
  });

  it('returns no GenAI data for a document without gen_ai fields', () => {
    const { result } = renderHook(() =>
      useGenAiData({ hit: buildHit({ flattened: { 'service.name': ['my-svc'] } }) })
    );

    expect(result.current.isGenAiSpan).toBe(false);
    expect(result.current.genAi).toBeUndefined();
    expect(result.current.loading).toBe(false);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('handles null-valued gen_ai fields without crashing or fetching (Discover null-padded records)', () => {
    // Regression for the doc viewer crash: Discover records carry null for
    // absent fields; message parsing must not throw and no _source fetch
    // should be triggered (nothing was ignored, the fields are just absent).
    const { result } = renderHook(() =>
      useGenAiData({
        hit: buildHit({
          flattened: {
            [INPUT_MESSAGES_FIELD]: null,
            'attributes.gen_ai.output.messages': null,
            'attributes.gen_ai.system_instructions': null,
            'attributes.gen_ai.operation.name': ['chat'],
            'attributes.gen_ai.request.model': ['gpt-4o'],
            'attributes.gen_ai.usage.input_tokens': [1100],
            'attributes.gen_ai.usage.output_tokens': [420],
          },
        }),
      })
    );

    expect(result.current.isGenAiSpan).toBe(true);
    expect(result.current.genAi?.inputMessages).toEqual([]);
    expect(result.current.genAi?.outputMessages).toEqual([]);
    expect(result.current.genAi?.inputTokens).toBe(1100);
    expect(result.current.loading).toBe(false);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('returns no GenAI data when all gen_ai keys are null-valued', () => {
    const { result } = renderHook(() =>
      useGenAiData({
        hit: buildHit({
          flattened: { [INPUT_MESSAGES_FIELD]: null, 'attributes.gen_ai.request.model': null },
        }),
      })
    );

    expect(result.current.isGenAiSpan).toBe(false);
    expect(result.current.genAi).toBeUndefined();
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('derives fields from flattened values without fetching when nothing was ignored', () => {
    const { result } = renderHook(() =>
      useGenAiData({
        hit: buildHit({
          flattened: {
            'attributes.gen_ai.request.model': ['gpt-4o'],
            [INPUT_MESSAGES_FIELD]: ['{"role":"user","content":"hi"}'],
          },
        }),
      })
    );

    expect(result.current.isGenAiSpan).toBe(true);
    expect(result.current.genAi?.requestModel).toBe('gpt-4o');
    expect(result.current.genAi?.inputMessages).toEqual([{ role: 'user', content: 'hi' }]);
    expect(result.current.loading).toBe(false);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('merges an ignored long message from raw._source without fetching', () => {
    const longMessage = '{"role":"user","content":"' + 'x'.repeat(2000) + '"}';
    const { result } = renderHook(() =>
      useGenAiData({
        hit: buildHit({
          flattened: { 'attributes.gen_ai.request.model': ['gpt-4o'] },
          _ignored: [INPUT_MESSAGES_FIELD],
          _source: { attributes: { 'gen_ai.input.messages': [longMessage] } },
        }),
      })
    );

    expect(result.current.genAi?.inputMessages[0].content).toHaveLength(2000);
    expect(result.current.loading).toBe(false);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('fetches _source for ignored messages when the record has no _source', async () => {
    const longMessage = '{"role":"user","content":"' + 'y'.repeat(2000) + '"}';
    mockSearch.mockReturnValue(
      of({
        rawResponse: {
          hits: {
            hits: [{ _source: { attributes: { 'gen_ai.input.messages': [longMessage] } } }],
          },
        },
      })
    );

    const { result } = renderHook(() =>
      useGenAiData({
        hit: buildHit({
          flattened: { 'attributes.gen_ai.request.model': ['gpt-4o'] },
          _ignored: [INPUT_MESSAGES_FIELD],
        }),
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(result.current.genAi?.inputMessages[0].content).toHaveLength(2000);
  });

  it('renders gracefully when the ignored message cannot be recovered', async () => {
    mockSearch.mockReturnValue(of({ rawResponse: { hits: { hits: [] } } }));

    const { result } = renderHook(() =>
      useGenAiData({
        hit: buildHit({
          flattened: { 'attributes.gen_ai.request.model': ['gpt-4o'] },
          _ignored: [INPUT_MESSAGES_FIELD],
        }),
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isGenAiSpan).toBe(true);
    expect(result.current.genAi?.requestModel).toBe('gpt-4o');
    expect(result.current.genAi?.inputMessages).toEqual([]);
  });
});
