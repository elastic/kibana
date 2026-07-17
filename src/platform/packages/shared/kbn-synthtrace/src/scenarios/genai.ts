/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates GenAI (OTel semantic conventions) APM traces across multiple services
 * for testing the GenAI tab in the span/transaction details flyout.
 *
 * Run: node scripts/synthtrace genai --live --clean
 */

import { apm, ApmSynthtracePipelineSchema } from '@kbn/synthtrace-client';
import type { ApmOtelFields } from '@kbn/synthtrace-client';

// gen_ai.* are not yet in the ApmOtelFields type — cast helper for unknown attributes
function genAiOverrides(fields: Record<string, unknown>): Partial<ApmOtelFields> {
  return fields as unknown as Partial<ApmOtelFields>;
}
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

// --- Message fixtures ---

const CHAT_INPUT_MESSAGES = JSON.stringify([
  {
    role: 'system',
    content:
      'You are an expert software engineer. Be concise and precise in your answers.',
  },
  {
    role: 'user',
    content:
      'Can you explain how the following Python code works?\n\n```python\ndef fib(n):\n    if n <= 1:\n        return n\n    return fib(n-1) + fib(n-2)\n```',
  },
  {
    role: 'assistant',
    content:
      'This is a **recursive Fibonacci** implementation. It returns `n` directly for base cases (0 or 1), then calls itself twice for any larger input.\n\n> Note: This has O(2ⁿ) time complexity — consider memoization for large inputs.',
  },
  {
    role: 'user',
    content: 'How would I memoize it?',
  },
]);

const CHAT_OUTPUT_MESSAGES = JSON.stringify([
  {
    role: 'assistant',
    content:
      '```python\nfrom functools import lru_cache\n\n@lru_cache(maxsize=None)\ndef fib(n):\n    if n <= 1:\n        return n\n    return fib(n-1) + fib(n-2)\n```\n\nThis reduces complexity to **O(n)** by caching previously computed results.',
  },
]);

const TOOL_INPUT_MESSAGES = JSON.stringify([
  { role: 'user', content: 'What is the weather in Paris?' },
]);

const TOOL_OUTPUT_MESSAGES = JSON.stringify([
  {
    role: 'assistant',
    parts: [
      {
        type: 'function',
        name: 'get_weather',
        args: { location: 'Paris', unit: 'celsius' },
      },
    ],
  },
  {
    role: 'tool',
    parts: [
      {
        type: 'function_result',
        name: 'get_weather',
        result: { temperature: 18, condition: 'partly cloudy', humidity: '65%' },
      },
    ],
  },
  {
    role: 'assistant',
    content: 'The current weather in Paris is **18°C** and partly cloudy with 65% humidity.',
  },
]);

const LONG_CONTENT = JSON.stringify([
  {
    role: 'user',
    content: [
      'Please analyze the following large document and summarize the key points:',
      '',
      ...Array.from({ length: 40 }, (_, i) => `Section ${i + 1}: This is a detailed paragraph about topic ${i + 1}. It contains important information that spans multiple lines and covers various aspects of the subject matter in great detail.`),
    ].join('\n'),
  },
]);

const scenario: Scenario<ApmOtelFields> = async () => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      // --- Service 1: multi-turn chat (OpenAI, gpt-4o) ---
      const chatInstance = apm
        .otelService({
          name: 'genai-chat-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'python',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('chat-instance-1');

      const chatSpans = range
        .interval('5s')
        .rate(1)
        .generator((timestamp) =>
          chatInstance
            .span({ name: 'chat gpt-4o', kind: 'Internal' })
            .overrides(
              genAiOverrides({
                'attributes.gen_ai.operation.name': 'chat',
                'attributes.gen_ai.system': 'openai',
                'attributes.gen_ai.provider.name': 'openai',
                'attributes.gen_ai.request.model': 'gpt-4o',
                'attributes.gen_ai.response.model': 'gpt-4o-2024-08-06',
                'attributes.gen_ai.usage.input_tokens': 320,
                'attributes.gen_ai.usage.output_tokens': 185,
                'attributes.gen_ai.request.temperature': 0.7,
                'attributes.gen_ai.request.top_p': 1,
                'attributes.gen_ai.request.max_tokens': 2048,
                'attributes.gen_ai.response.id': 'chatcmpl-abc123',
                'attributes.gen_ai.response.finish_reasons': ['stop'],
                'attributes.gen_ai.input.messages': CHAT_INPUT_MESSAGES,
                'attributes.gen_ai.output.messages': CHAT_OUTPUT_MESSAGES,
              })
            )
            .timestamp(timestamp)
            .duration(2340)
            .success()
        );

      // --- Service 2: tool/function calls (Anthropic) ---
      const toolInstance = apm
        .otelService({
          name: 'genai-tool-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'python',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('tool-instance-1');

      const toolSpans = range
        .interval('8s')
        .rate(1)
        .generator((timestamp) =>
          toolInstance
            .span({ name: 'chat claude-3-5-sonnet', kind: 'Internal' })
            .overrides(
              genAiOverrides({
                'attributes.gen_ai.operation.name': 'chat',
                'attributes.gen_ai.system': 'anthropic',
                'attributes.gen_ai.provider.name': 'anthropic',
                'attributes.gen_ai.request.model': 'claude-3-5-sonnet-20241022',
                'attributes.gen_ai.usage.input_tokens': 95,
                'attributes.gen_ai.usage.output_tokens': 62,
                'attributes.gen_ai.request.max_tokens': 1024,
                'attributes.gen_ai.response.finish_reasons': ['tool_use'],
                'attributes.gen_ai.input.messages': TOOL_INPUT_MESSAGES,
                'attributes.gen_ai.output.messages': TOOL_OUTPUT_MESSAGES,
              })
            )
            .timestamp(timestamp)
            .duration(1450)
            .success()
        );

      // --- Service 3: minimal fields only (Amazon Bedrock) ---
      const minimalInstance = apm
        .otelService({
          name: 'genai-minimal-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'java',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('minimal-instance-1');

      const minimalSpans = range
        .interval('10s')
        .rate(1)
        .generator((timestamp) =>
          minimalInstance
            .span({ name: 'chat titan-text-express-v1', kind: 'Internal' })
            .overrides(
              genAiOverrides({
                'attributes.gen_ai.operation.name': 'chat',
                'attributes.gen_ai.system': 'aws.bedrock',
                'attributes.gen_ai.request.model': 'amazon.titan-text-express-v1',
                'attributes.gen_ai.usage.input_tokens': 55,
                'attributes.gen_ai.usage.output_tokens': 38,
              })
            )
            .timestamp(timestamp)
            .duration(890)
            .success()
        );

      // --- Service 4: long content (exercises View more toggle) ---
      const longInstance = apm
        .otelService({
          name: 'genai-long-content-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'python',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('long-instance-1');

      const longSpans = range
        .interval('15s')
        .rate(1)
        .generator((timestamp) =>
          longInstance
            .span({ name: 'chat gpt-4o-mini', kind: 'Internal' })
            .overrides(
              genAiOverrides({
                'attributes.gen_ai.operation.name': 'chat',
                'attributes.gen_ai.system': 'openai',
                'attributes.gen_ai.request.model': 'gpt-4o-mini',
                'attributes.gen_ai.usage.input_tokens': 1840,
                'attributes.gen_ai.usage.output_tokens': 512,
                'attributes.gen_ai.input.messages': LONG_CONTENT,
              })
            )
            .timestamp(timestamp)
            .duration(5200)
            .success()
        );

      // --- Service 5: non-GenAI span (GenAI tab must NOT appear) ---
      const regularInstance = apm
        .otelService({
          name: 'regular-http-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'go',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('regular-instance-1');

      const regularSpans = range
        .interval('2s')
        .rate(1)
        .generator((timestamp) =>
          regularInstance
            .span({ name: 'GET /api/users', kind: 'Server' })
            .overrides({
              'attributes.server.address': 'regular-http-service',
            })
            .timestamp(timestamp)
            .duration(45)
            .success()
        );

      return [
        withClient(
          apmEsClient,
          [chatSpans, toolSpans, minimalSpans, longSpans, regularSpans].flatMap((s) => s)
        ),
      ];
    },
    setupPipeline: ({ apmEsClient }) => {
      apmEsClient.setPipeline(apmEsClient.resolvePipelineType(ApmSynthtracePipelineSchema.Otel));
    },
  };
};

export default scenario;
