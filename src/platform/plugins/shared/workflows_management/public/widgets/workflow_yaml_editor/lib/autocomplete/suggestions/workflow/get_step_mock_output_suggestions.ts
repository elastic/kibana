/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/code-editor';
import { getBuiltInStepDefinition } from '@kbn/workflows';
import { getSchemaAtPath, getShape } from '@kbn/workflows/common/utils/zod';
import type { z } from '@kbn/zod/v4';
import { getCachedAllConnectorsMap } from '../../../../../../../common/schema';
import type { AutocompleteContext } from '../../context/autocomplete.types';

function resolveStepOutputSchema(stepType: string): z.ZodType | undefined {
  const connector = getCachedAllConnectorsMap()?.get(stepType);
  if (connector?.outputSchema) {
    return connector.outputSchema;
  }
  return getBuiltInStepDefinition(stepType)?.outputSchema;
}

/**
 * Suggests property names from a step's `outputSchema` when authoring `mock.output` in YAML.
 */
export function getStepMockOutputSuggestions(
  autocompleteContext: AutocompleteContext
): monaco.languages.CompletionItem[] {
  const { focusedStepInfo, path, range, line } = autocompleteContext;
  if (!focusedStepInfo?.stepType || !path?.length) {
    return [];
  }

  const mockIndex = path.lastIndexOf('mock');
  if (mockIndex === -1 || path[mockIndex + 1] !== 'output') {
    return [];
  }

  // Only suggest property keys when the cursor is in a key position
  const trimmedLine = line.trimStart();
  if (trimmedLine.startsWith('output:') || /^[\w][\w-]*\s*:/.test(trimmedLine)) {
    return [];
  }

  const baseOutputSchema = resolveStepOutputSchema(focusedStepInfo.stepType);
  if (!baseOutputSchema) {
    return [];
  }

  const subSegments = path
    .slice(mockIndex + 2)
    .filter((seg): seg is string => typeof seg === 'string' && seg.length > 0);
  const targetSchema =
    subSegments.length > 0
      ? getSchemaAtPath(baseOutputSchema, subSegments.join('.')).schema
      : baseOutputSchema;
  if (!targetSchema) {
    return [];
  }

  const shape = getShape(targetSchema);
  return Object.entries(shape).map(([propName, propSchema]) => ({
    label: propName,
    kind: monaco.languages.CompletionItemKind.Property,
    insertText: `${propName}: `,
    range,
    documentation: propSchema?.description,
  }));
}
