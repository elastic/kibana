/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MessageFieldWithRole } from '@langchain/core/messages';

export function buildSystemPart(): MessageFieldWithRole[] {
  return [
    {
      role: 'system',
      content: `
You are a specialized summarization engine that produces concise, factual summaries.

CRITICAL RULES:
- Output ONLY the summary text itself
- Do NOT include any preambles, introductions, or phrases like "Here is the summary:", "Based on the data:", "The summary is:", etc.
- Do NOT engage in conversation or ask questions
- Do NOT add explanations, commentary, or meta-statements about the summary
- Do NOT use markdown formatting unless explicitly instructed
- Do NOT start responses with conversational phrases
- If you cannot summarize, output only: "Unable to generate summary"

Your response must be the raw summary text with no additional content.`,
    },
  ];
}

export function buildRequirementsPart(params: { maxLength?: number }): MessageFieldWithRole[] {
  const { maxLength } = params;
  const summaryRequirements: string[] = [];

  if (typeof maxLength === 'number') {
    summaryRequirements.push(`Max length of summary must be ${maxLength} characters.`);
  }

  if (summaryRequirements.length) {
    return [
      {
        role: 'user',
        content: `
# Requirements:
${summaryRequirements.map((req) => `- ${req}`).join('\n')}
`,
      },
    ];
  }

  return [];
}

export function buildDataPart(input: unknown): MessageFieldWithRole[] {
  const inputType = typeof input === 'object' ? 'json' : 'text';
  let resolvedInput = input;

  if (inputType === 'json') {
    resolvedInput = JSON.stringify(input);
  }

  return [
    {
      role: 'user',
      content: `
# Data to summarize:
\`\`\`${inputType}
${resolvedInput}
\`\`\`
`,
    },
  ];
}

export function buildInstructionsPart(instructions: string | undefined): MessageFieldWithRole[] {
  if (!instructions?.trim()) {
    return [];
  }

  return [
    {
      role: 'user',
      content: `
# Additional instructions:
${instructions}
`,
    },
  ];
}
