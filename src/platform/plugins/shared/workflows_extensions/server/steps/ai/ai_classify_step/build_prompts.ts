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
}): MessageFieldWithRole[] {
  const { categories, allowMultipleCategories, fallbackCategory, includeRationale } = params;

  const categoriesList = categories.map((cat) => `- ${cat}`).join('\n');
  const outputFormat = allowMultipleCategories
    ? includeRationale
      ? `{
  "categories": ["category1", "category2"],
  "rationale": "explanation of why these categories were chosen"
}`
      : `{
  "categories": ["category1", "category2"]
}`
    : includeRationale
    ? `{
  "category": "selected_category",
  "rationale": "explanation of why this category was chosen"
}`
    : `{
  "category": "selected_category"
}`;

  const fallbackInstruction = fallbackCategory
    ? `- If the input does not clearly match any defined category, use the fallback category: "${fallbackCategory}"`
    : '- If the input does not clearly match any defined category, make your best judgment and select the most appropriate category';

  const multiLabelInstruction = allowMultipleCategories
    ? '- You may select multiple categories if the input matches more than one category\n- Return all matching categories in the "categories" array'
    : '- You must select exactly ONE category from the provided list\n- Return the selected category in the "category" field';

  const rationaleInstruction = includeRationale
    ? '\n- You MUST provide a clear, concise explanation in the "rationale" field explaining why you chose this category/categories'
    : '\n- Do NOT include a rationale field in your response';

  return [
    {
      role: 'system',
      content: `You are a specialized classification engine that categorizes data into predefined categories.

CRITICAL RULES:
- Output ONLY valid JSON matching the exact format specified below
- Do NOT include any preambles, introductions, explanations, or markdown formatting
- Do NOT wrap the JSON in markdown code blocks or any other formatting
- Do NOT engage in conversation or ask questions
- Do NOT add any text before or after the JSON object
- The output must be parseable by JSON.parse()

AVAILABLE CATEGORIES:
${categoriesList}

CLASSIFICATION RULES:
${multiLabelInstruction}
${fallbackInstruction}
- Categories are case-sensitive and must match exactly as provided
- Only use categories from the available categories list${rationaleInstruction}

OUTPUT FORMAT (valid JSON only):
${outputFormat}

Your response must be ONLY the JSON object with no additional content.`,
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
      content: 'Classify the provided data and return ONLY the JSON response:',
    },
  ];
}
