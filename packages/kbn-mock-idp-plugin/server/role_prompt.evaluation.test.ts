/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ChatOpenAI } from '@langchain/openai';
import { LabeledCriteriaEvalChain } from 'langchain/evaluation';

import { z } from '@kbn/zod';

import { MockIdpRolePromptTemplate } from './role_prompt';

// Minimal feature shape needed by the prompt template
const mockFeatures = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    app: ['dashboards'],
    privileges: { all: { disabled: false }, read: { disabled: false } },
  },
  {
    id: 'discover',
    name: 'Discover',
    app: ['discover'],
    privileges: { all: { disabled: false }, read: { disabled: false } },
  },
  {
    id: 'visualize',
    name: 'Visualizations',
    app: ['visualize'],
    privileges: { all: { disabled: false }, read: { disabled: false } },
  },
  {
    id: 'ml',
    name: 'Machine Learning',
    app: ['ml'],
    privileges: { all: { disabled: false }, read: { disabled: false } },
  },
  {
    id: 'observabilityAIAssistant',
    name: 'AI Assistant',
    app: ['aiAssistant'],
    privileges: { all: { disabled: false }, read: { disabled: true } },
  },
] as any[];

const featureIds = mockFeatures.map((f) => f.id).concat(['base']) as [string, ...string[]];

const roleSchema = z.object({
  kibana: z.array(
    z.object({ id: z.enum(featureIds), access: z.enum(['all', 'read']), space: z.string() })
  ),
  elasticsearch: z.array(z.object({ index: z.string(), access: z.enum(['all', 'read']) })),
  accessToSystemIndices: z.enum(['all', 'read', 'none']),
});

describe.skip('Role prompt LLM-as-judge evaluation', () => {
  jest.setTimeout(60_000);

  let prompt: MockIdpRolePromptTemplate;
  let chain: ReturnType<typeof buildChain>;
  let evaluator: LabeledCriteriaEvalChain;

  function buildLlm(model: string) {
    return new ChatOpenAI({
      model,
      temperature: 0,
      apiKey: process.env.GEMINI_API_KEY,
      configuration: {
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      },
    });
  }

  function buildChain() {
    return prompt.pipe(buildLlm('gemini-2.0-flash').withStructuredOutput(roleSchema));
  }

  beforeAll(async () => {
    prompt = new MockIdpRolePromptTemplate();
    chain = buildChain();
    evaluator = await LabeledCriteriaEvalChain.fromLLM(buildLlm('gemini-2.5-pro'), 'correctness');
  });

  const testCases = [
    {
      description: 'Read-only access to all features in all spaces',
      expected: 'base feature with read access, space set to *',
    },
    {
      description: 'Full access to dashboards in space_a',
      expected: 'dashboard feature with all access, space set to space_a',
    },
    {
      description: 'Read access to discover and dashboard in the default space',
      expected: 'discover and dashboard features with read access in default space',
    },
    {
      description: 'Write access to all indices in Elasticsearch',
      expected: 'elasticsearch index * with all access',
    },
  ];

  test.each(testCases)('$description', async ({ description, expected }) => {
    const invokeArgs = { features: mockFeatures, userQuery: description, projectType: undefined };
    const role = await chain.invoke(invokeArgs);

    const messages = await prompt.formatMessages(invokeArgs);
    const formattedPrompt = messages.map((m) => m.content).join('\n\n');

    const { score, reasoning } = await evaluator.evaluateStrings({
      input: formattedPrompt,
      prediction: JSON.stringify(role, null, 2),
      reference: expected,
    });

    console.log(`\n[${score === 1 ? 'PASS' : 'FAIL'}] ${description}`);
    console.log(`Reasoning: ${reasoning}`);

    expect(score).toBe(1);
  });
});
