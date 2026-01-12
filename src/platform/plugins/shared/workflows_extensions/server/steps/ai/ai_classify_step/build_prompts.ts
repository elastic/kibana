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
You are a specialized classification engine that categorizes data into predefined categories.

# CRITICAL RULES:
- Output ONLY valid JSON matching the exact format specified
- Your response must be PLAIN JSON with NO formatting, NO code blocks, NO markdown
- DO NOT wrap your response in \`\`\`json or \`\`\` blocks
- DO NOT include any text before or after the JSON
- The output must be a raw JSON string that can be parsed directly
- Categories are case-sensitive and must match exactly as provided
- Only use categories from the available categories list
`.trim(),
    },
  ];
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
      content: `# DATA TO CLASSIFY:
\`\`\`${inputType}
${resolvedInput}
\`\`\`
`.trim(),
    },
  ];
}

export function buildInstructionsPart(instructions: string | undefined): MessageFieldWithRole[] {
  if (!instructions) {
    return [];
  }

  return [
    {
      role: 'user',
      content: `# ADDITIONAL CLASSIFICATION INSTRUCTIONS:
${instructions}
`,
    },
  ];
}

export function buildClassificationRequestPart(params: {
  categories: string[];
  allowMultipleCategories: boolean;
  fallbackCategory?: string;
  includeRationale: boolean;
}): MessageFieldWithRole[] {
  const { categories, allowMultipleCategories, fallbackCategory, includeRationale } = params;

  const classificationRules: string[] = [];

  if (fallbackCategory) {
    classificationRules.push(
      `If the input does not clearly match any defined category, use the fallback category: "${fallbackCategory}"`
    );
  }

  if (allowMultipleCategories) {
    classificationRules.push(
      'You may select multiple categories if the input matches more than one category'
    );
    classificationRules.push('Return all matching categories in the "categories" array');
  } else {
    classificationRules.push('You must select exactly ONE category from the provided list');
    classificationRules.push('Return the selected category in the "category" field');
  }

  if (includeRationale) {
    classificationRules.push(
      'You MUST provide a clear, concise explanation in the "rationale" field explaining why you chose this category/categories'
    );
  }
  return [
    {
      role: 'user',
      content: `
AVAILABLE CATEGORIES:
${categories.map((cat) => `- ${cat}`).join('\n')}

CLASSIFICATION RULES:
${classificationRules.map((rule) => rule.trim()).join('\n- ')}
`.trim(),
    },
  ];
}
