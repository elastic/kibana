/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getGenAiFields,
  getMessageCopyText,
  hasGenAiData,
  parseGenAiMessages,
} from './get_genai_fields';

describe('hasGenAiData', () => {
  it('returns true when attributes.gen_ai.* field is present', () => {
    expect(hasGenAiData({ 'attributes.gen_ai.request.model': ['gpt-4'] })).toBe(true);
  });

  it('returns true for bare gen_ai.* keys', () => {
    expect(hasGenAiData({ 'gen_ai.operation.name': ['chat'] })).toBe(true);
  });

  it('returns true for labels.gen_ai_* (APM Server ingest with dots→underscores)', () => {
    // labels.gen_ai_request_model has .gen_ai_ which matches the pattern — this is desired
    // so APM Server ingest GenAI spans also get the tab
    expect(hasGenAiData({ 'labels.gen_ai_request_model': ['gpt-4'] })).toBe(true);
  });

  it('returns false when no gen_ai fields present', () => {
    expect(hasGenAiData({ 'service.name': ['my-svc'], 'span.id': ['abc'] })).toBe(false);
  });

  it('returns false when gen_ai keys exist but all values are null (ES|QL zip-padded rows)', () => {
    expect(
      hasGenAiData({
        'attributes.gen_ai.request.model': null,
        'gen_ai.input.messages': null,
        'service.name': 'cart',
      })
    ).toBe(false);
  });

  it('returns false when gen_ai values are arrays of nulls', () => {
    expect(hasGenAiData({ 'attributes.gen_ai.input.messages': [null] })).toBe(false);
  });

  it('returns false when gen_ai keys exist with undefined values', () => {
    expect(hasGenAiData({ 'attributes.gen_ai.request.model': undefined })).toBe(false);
  });

  it('returns true when at least one gen_ai field has a real value among null ones', () => {
    expect(
      hasGenAiData({
        'attributes.gen_ai.input.messages': null,
        'attributes.gen_ai.usage.input_tokens': 1100,
      })
    ).toBe(true);
  });

  it('returns false for empty metadata', () => {
    expect(hasGenAiData({})).toBe(false);
  });
});

describe('parseGenAiMessages', () => {
  describe('OLD format (single-element array containing a JSON array string)', () => {
    it('parses a JSON array string with role/content schema', () => {
      const raw = JSON.stringify([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
      ]);
      const result = parseGenAiMessages([raw]);
      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('user');
      expect(result[0].content).toBe('Hello');
    });

    it('parses messages with parts array schema', () => {
      const raw = JSON.stringify([
        { role: 'user', parts: [{ type: 'text', content: 'Explain this code' }] },
      ]);
      const result = parseGenAiMessages([raw]);
      expect(result[0].parts?.[0].type).toBe('text');
    });

    it('parses messages with function/tool parts', () => {
      const raw = JSON.stringify([
        { role: 'assistant', parts: [{ type: 'function', name: 'get_weather', args: {} }] },
      ]);
      const result = parseGenAiMessages([raw]);
      expect(result[0].parts?.[0].type).toBe('function');
    });

    it('returns raw-text fallback when JSON is malformed', () => {
      const result = parseGenAiMessages(['[broken json']);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('user');
      expect(result[0].content).toBe('[broken json');
    });

    it('handles a plain object (non-array) within a single-element array', () => {
      const raw = JSON.stringify({ role: 'user', content: 'single message' });
      const result = parseGenAiMessages([raw]);
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('user');
    });
  });

  describe('NEW format (array of individual message strings)', () => {
    it('happy path: 2-element array, each a valid message JSON', () => {
      const result = parseGenAiMessages([
        JSON.stringify({ role: 'user', content: 'hello' }),
        JSON.stringify({ role: 'assistant', content: 'hi' }),
      ]);
      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('user');
      expect(result[0].content).toBe('hello');
      expect(result[1].role).toBe('assistant');
      expect(result[1].content).toBe('hi');
    });

    it('mixed roles: user, assistant, system, tool messages', () => {
      const result = parseGenAiMessages([
        JSON.stringify({ role: 'system', content: 'You are a helpful assistant.' }),
        JSON.stringify({ role: 'user', content: 'What is the weather?' }),
        JSON.stringify({ role: 'tool', content: 'Sunny, 72°F' }),
        JSON.stringify({ role: 'assistant', content: 'It is sunny and 72°F.' }),
      ]);
      expect(result).toHaveLength(4);
      expect(result[0].role).toBe('system');
      expect(result[1].role).toBe('user');
      expect(result[2].role).toBe('tool');
      expect(result[3].role).toBe('assistant');
    });

    it('malformed element: one element is not valid JSON => falls back to raw string content', () => {
      const result = parseGenAiMessages([
        JSON.stringify({ role: 'user', content: 'hello' }),
        '{not valid json',
      ]);
      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('user');
      expect(result[1].role).toBe('user');
      expect(result[1].content).toBe('{not valid json');
    });
  });

  it('returns empty array for undefined', () => {
    expect(parseGenAiMessages(undefined)).toHaveLength(0);
  });

  it('returns empty array for empty array input', () => {
    expect(parseGenAiMessages([])).toHaveLength(0);
  });
});

describe('getGenAiFields', () => {
  const metadata = {
    'attributes.gen_ai.operation.name': ['chat'],
    'attributes.gen_ai.request.model': ['gpt-4o'],
    'attributes.gen_ai.provider.name': ['openai'],
    'attributes.gen_ai.usage.input_tokens': [120],
    'attributes.gen_ai.usage.output_tokens': [45],
    'attributes.gen_ai.request.temperature': [0.7],
    'attributes.gen_ai.request.max_tokens': [2048],
    'attributes.gen_ai.response.model': ['gpt-4o-2024-08-06'],
    'attributes.gen_ai.response.id': ['resp-abc123'],
    'attributes.gen_ai.input.messages': [JSON.stringify({ role: 'user', content: 'Hello' })],
    'attributes.gen_ai.output.messages': [JSON.stringify({ role: 'assistant', content: 'Hi!' })],
  };

  it('extracts all core fields correctly', () => {
    const fields = getGenAiFields(metadata);
    expect(fields.operationName).toBe('chat');
    expect(fields.requestModel).toBe('gpt-4o');
    expect(fields.provider).toBe('openai');
    expect(fields.inputTokens).toBe(120);
    expect(fields.outputTokens).toBe(45);
  });

  it('extracts request params', () => {
    const fields = getGenAiFields(metadata);
    expect(fields.requestParams.temperature).toBe(0.7);
    expect(fields.requestParams.max_tokens).toBe(2048);
  });

  it('extracts response fields', () => {
    const fields = getGenAiFields(metadata);
    expect(fields.responseModel).toBe('gpt-4o-2024-08-06');
    expect(fields.response.id).toBe('resp-abc123');
  });

  it('preserves all elements of multi-valued finish_reasons', () => {
    const fields = getGenAiFields({
      'attributes.gen_ai.response.finish_reasons': ['stop', 'length', 'tool_calls'],
    });
    expect(fields.response.finish_reasons).toEqual(['stop', 'length', 'tool_calls']);
  });

  it('wraps a single finish_reason value in an array', () => {
    const fields = getGenAiFields({
      'attributes.gen_ai.response.finish_reasons': 'stop',
    });
    expect(fields.response.finish_reasons).toEqual(['stop']);
  });

  it('parses input and output messages', () => {
    const fields = getGenAiFields(metadata);
    expect(fields.inputMessages).toHaveLength(1);
    expect(fields.inputMessages[0].role).toBe('user');
    expect(fields.outputMessages[0].role).toBe('assistant');
  });

  it('returns empty arrays when message fields are absent', () => {
    const fields = getGenAiFields({});
    expect(fields.inputMessages).toHaveLength(0);
    expect(fields.outputMessages).toHaveLength(0);
  });

  it('falls back to gen_ai.system when provider.name is absent', () => {
    const fields = getGenAiFields({ 'attributes.gen_ai.system': ['azure'] });
    expect(fields.provider).toBe('azure');
  });

  it('reads bare gen_ai.* keys (no attributes. prefix)', () => {
    const fields = getGenAiFields({
      'gen_ai.operation.name': ['chat'],
      'gen_ai.request.model': ['gpt-4o'],
      'gen_ai.usage.input_tokens': [50],
    });
    expect(fields.operationName).toBe('chat');
    expect(fields.requestModel).toBe('gpt-4o');
    expect(fields.inputTokens).toBe(50);
  });

  it('reads labels.gen_ai_* keys (APM Server ingest, dots→underscores)', () => {
    const fields = getGenAiFields({
      'labels.gen_ai_operation_name': ['chat'],
      'labels.gen_ai_request_model': ['claude-3'],
      'labels.gen_ai_system': ['anthropic'],
    });
    expect(fields.operationName).toBe('chat');
    expect(fields.requestModel).toBe('claude-3');
    expect(fields.provider).toBe('anthropic');
  });

  it('parses messages from bare gen_ai.* keys (no attributes. prefix)', () => {
    const fields = getGenAiFields({
      'gen_ai.input.messages': [JSON.stringify({ role: 'user', content: 'Hello' })],
      'gen_ai.output.messages': [JSON.stringify({ role: 'assistant', content: 'Hi!' })],
    });
    expect(fields.inputMessages).toHaveLength(1);
    expect(fields.inputMessages[0].content).toBe('Hello');
    expect(fields.outputMessages[0].role).toBe('assistant');
  });

  it('parses messages from labels.gen_ai_* keys (APM Server ingest)', () => {
    const fields = getGenAiFields({
      'labels.gen_ai_input_messages': [JSON.stringify({ role: 'user', content: 'Hello' })],
    });
    expect(fields.inputMessages).toHaveLength(1);
    expect(fields.inputMessages[0].role).toBe('user');
  });
});

describe('getMessageCopyText', () => {
  it('returns plain content string verbatim', () => {
    expect(getMessageCopyText({ role: 'user', content: 'Hello world' })).toBe('Hello world');
  });

  it('returns an empty string for a message with empty content', () => {
    // empty content falls through to JSON.stringify the whole message
    const result = getMessageCopyText({ role: 'user', content: '' });
    expect(result).toBe(JSON.stringify({ role: 'user', content: '' }, null, 2));
  });

  it('joins text parts verbatim and structured parts as pretty JSON, separated by blank lines', () => {
    const msg = {
      role: 'assistant',
      parts: [
        { type: 'text', content: 'Here is the result.' },
        { type: 'function', name: 'get_weather', args: { location: 'Paris' } },
        { type: 'text', content: 'Done.' },
      ],
    };
    const result = getMessageCopyText(msg);
    const sections = result.split('\n\n');
    expect(sections[0]).toBe('Here is the result.');
    expect(sections[1]).toBe(
      JSON.stringify(
        { type: 'function', name: 'get_weather', args: { location: 'Paris' } },
        null,
        2
      )
    );
    expect(sections[2]).toBe('Done.');
  });

  it('serialises a structured message (tool_calls, no text content) as pretty JSON', () => {
    const msg = {
      role: 'assistant',
      tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'search' } }],
    };
    expect(getMessageCopyText(msg)).toBe(JSON.stringify(msg, null, 2));
  });
});

describe('null-valued gen_ai fields (Discover records)', () => {
  it('does not throw and returns empty messages for a doc with null message fields', () => {
    // Regression: Discover flattened records carry null for absent fields;
    // parseGenAiMessages used to throw on [null] (raw[0].trimStart()).
    const metadata = {
      'attributes.gen_ai.conversation.id': 'conv-agent-001',
      'attributes.gen_ai.input.messages': null,
      'attributes.gen_ai.output.messages': null,
      'attributes.gen_ai.system_instructions': null,
      'attributes.gen_ai.operation.name': 'chat',
      'attributes.gen_ai.provider.name': 'openai',
      'attributes.gen_ai.request.model': 'gpt-4o',
      'attributes.gen_ai.response.model': null,
      'attributes.gen_ai.response.finish_reasons': null,
      'attributes.gen_ai.usage.input_tokens': 1100,
      'attributes.gen_ai.usage.output_tokens': 420,
      'gen_ai.input.messages': null,
    };

    const fields = getGenAiFields(metadata);

    expect(fields.inputMessages).toEqual([]);
    expect(fields.outputMessages).toEqual([]);
    expect(fields.systemInstructions).toBeUndefined();
    expect(fields.response.finish_reasons).toBeUndefined();
    expect(fields.operationName).toBe('chat');
    expect(fields.requestModel).toBe('gpt-4o');
    expect(fields.inputTokens).toBe(1100);
    expect(fields.outputTokens).toBe(420);
  });

  it('does not let a null attributes.* value shadow the bare gen_ai.* fallback', () => {
    const fields = getGenAiFields({
      'attributes.gen_ai.request.model': null,
      'gen_ai.request.model': 'gpt-4o',
    });

    expect(fields.requestModel).toBe('gpt-4o');
  });

  it('drops null elements from multi-valued fields', () => {
    const fields = getGenAiFields({
      'attributes.gen_ai.response.finish_reasons': [null, 'stop'],
    });

    expect(fields.response.finish_reasons).toEqual(['stop']);
  });
});
