/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMessageBlocks, getToolNamesById } from './get_message_blocks';

describe('getMessageBlocks', () => {
  it('maps OTel parts to typed blocks', () => {
    expect(
      getMessageBlocks({
        role: 'assistant',
        parts: [
          { type: 'text', content: 'Looking it up' },
          { type: 'tool_call', id: 'call-1', name: 'search', arguments: '{"q":"x"}' },
          { type: 'tool_call_response', id: 'call-1', response: '{"hits":[]}' },
          { type: 'reasoning', content: 'hmm' },
        ],
      })
    ).toEqual([
      { type: 'text', content: 'Looking it up' },
      { type: 'tool_call', id: 'call-1', name: 'search', arguments: { q: 'x' } },
      { type: 'tool_call_response', id: 'call-1', response: { hits: [] } },
      { type: 'unknown', value: { type: 'reasoning', content: 'hmm' } },
    ]);
  });

  it('maps legacy OpenAI-style tool_calls on an assistant message', () => {
    expect(
      getMessageBlocks({
        role: 'assistant',
        content: null as unknown as string,
        tool_calls: [{ id: 'call-1', function: { name: 'search', arguments: '{}' } }],
      })
    ).toEqual([{ type: 'tool_call', id: 'call-1', name: 'search', arguments: {} }]);
  });

  it('maps a legacy tool message to a tool response block', () => {
    expect(
      getMessageBlocks({ role: 'tool', tool_call_id: 'call-1', content: '{"hits":[]}' })
    ).toEqual([{ type: 'tool_call_response', id: 'call-1', response: { hits: [] } }]);
  });

  it('falls back to the whole message when it has no content', () => {
    const message = { role: 'assistant', foo: 'bar' };
    expect(getMessageBlocks(message)).toEqual([{ type: 'unknown', value: message }]);
  });
});

describe('getToolNamesById', () => {
  it('collects tool names from both parts and legacy tool_calls', () => {
    const namesById = getToolNamesById([
      { role: 'assistant', parts: [{ type: 'tool_call', id: 'a', name: 'search', arguments: '' }] },
      { role: 'assistant', tool_calls: [{ id: 'b', function: { name: 'esql' } }] },
    ]);
    expect(Object.fromEntries(namesById)).toEqual({ a: 'search', b: 'esql' });
  });
});
