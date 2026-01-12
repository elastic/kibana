/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import type { AiClassifyStepOutputSchema } from '../../../../common/steps/ai';

export function validateModelResponse({
  modelResponse,
  schema,
  expectedCategories,
  fallbackCategory,
}: {
  modelResponse: unknown;
  schema: z.ZodType;
  expectedCategories: string[];
  fallbackCategory: string | undefined;
}): void {
  const safeParseResult = schema.safeParse(modelResponse);

  if (safeParseResult.error) {
    throw new Error(
      `Model returned invalid JSON. Message: ${
        safeParseResult.error
      }. Raw response: ${JSON.stringify(modelResponse)}.`
    );
  }

  const parsedResponse = safeParseResult.data as z.infer<AiClassifyStepOutputSchema>;

  const returnedCategories = parsedResponse.categories?.length
    ? parsedResponse.categories
    : [parsedResponse.category as string];
  const categoriesSet = new Set([
    ...expectedCategories,
    ...(fallbackCategory ? [fallbackCategory] : []),
  ]);

  const unexpectedCategories = returnedCategories.filter(
    (returnedCategory: string) => !categoriesSet.has(returnedCategory)
  );

  if (unexpectedCategories.length) {
    throw new Error(
      `Model returned unexpected categories: ${unexpectedCategories.join(
        ', '
      )}. Raw response: ${JSON.stringify(modelResponse)}.`
    );
  }
}
