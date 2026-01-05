/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MessageFieldWithRole } from '@langchain/core/messages';

export function buildSystemPart(params: {
  categories: string[];
  allowMultipleCategories: boolean;
  fallbackCategory?: string;
  includeRationale: boolean;
  jsonSchema: unknown;
}): MessageFieldWithRole[] {
  const { categories, allowMultipleCategories, fallbackCategory, includeRationale, jsonSchema } =
    params;

  const categoriesList = categories.map((cat) => `- ${cat}`).join('\n');

  const classificationRules: string[] = [];

  if (fallbackCategory) {
    classificationRules.push(
      `If the input does not clearly match any defined category, use the fallback category: "${fallbackCategory}"`
    );
  } else {
    classificationRules.push(
      'If the input does not clearly match any defined category, use null JSON value (not "null" string)'
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
      role: 'system',
      content: `You are a specialized classification engine that categorizes data into predefined categories.

EXPECTED OUTPUT SCHEMA:
\`\`\`json
${JSON.stringify(jsonSchema)}
\`\`\`

AVAILABLE CATEGORIES:
${categoriesList}

CLASSIFICATION RULES:
${classificationRules.map((x) => x.trim()).join('\n-')}
- Categories are case-sensitive and must match exactly as provided
- Only use categories from the available categories list

CRITICAL RULES:
- Output ONLY valid JSON matching the exact format specified
- Your response must be PLAIN JSON with NO formatting, NO code blocks, NO markdown
- DO NOT wrap your response in \`\`\`json or \`\`\` blocks
- DO NOT include any text before or after the JSON
- The output must be a raw JSON string that can be parsed directly
`,
    },
  ];
}

export function buildDataPart(input: unknown): MessageFieldWithRole[] {
  const inputType = typeof input === 'object' ? 'json' : 'text';
  let resolvedInput = input;

  if (inputType === 'json') {
    resolvedInput = JSON.stringify(input, null, 2);
  }

  return [
    {
      role: 'user',
      content: `# Data to classify:
\`\`\`${inputType}
${resolvedInput}
\`\`\`
`,
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
      content: `# Additional classification instructions:
${instructions}
`,
    },
  ];
}

export function buildClassificationRequestPart(): MessageFieldWithRole[] {
  return [
    {
      role: 'user',
      content: 'Classify the provided data and return ONLY the JSON response',
    },
  ];
}
