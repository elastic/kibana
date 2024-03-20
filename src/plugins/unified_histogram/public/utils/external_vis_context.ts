/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Suggestion } from '@kbn/lens-plugin/public';
import type { UnifiedHistogramVisContext } from '../types';
import { removeTablesFromLensAttributes } from './lens_vis_from_table';

export const exportVisContext = (
  visContext: UnifiedHistogramVisContext | undefined
): UnifiedHistogramVisContext | undefined => {
  if (
    !visContext ||
    !visContext.requestData ||
    !visContext.attributes ||
    !visContext.suggestionType
  ) {
    return undefined;
  }

  try {
    const lightweightVisContext = visContext
      ? {
          suggestionType: visContext.suggestionType,
          requestData: visContext.requestData,
          attributes: removeTablesFromLensAttributes(visContext.attributes),
        }
      : undefined;

    const visContextWithoutUndefinedValues = lightweightVisContext
      ? JSON.parse(JSON.stringify(lightweightVisContext))
      : undefined;

    return visContextWithoutUndefinedValues;
  } catch {
    return undefined;
  }
};

export function canImportVisContext(
  visContext: unknown | undefined
): visContext is UnifiedHistogramVisContext {
  return (
    !!visContext &&
    typeof visContext === 'object' &&
    'requestData' in visContext &&
    'attributes' in visContext &&
    'suggestionType' in visContext &&
    !!visContext.requestData &&
    !!visContext.attributes &&
    !!visContext.suggestionType &&
    typeof visContext.requestData === 'object' &&
    typeof visContext.attributes === 'object' &&
    typeof visContext.suggestionType === 'string'
  );
}

export const isSuggestionAndVisContextCompatible = (
  suggestion: Suggestion | undefined,
  externalVisContext: UnifiedHistogramVisContext | undefined
): boolean => {
  if (!suggestion && !externalVisContext) {
    return true;
  }
  return (
    suggestion?.visualizationId === externalVisContext?.attributes?.visualizationType &&
    // @ts-expect-error visualization state has different structure between vis types
    suggestion?.visualizationState?.shape ===
      // @ts-expect-error visualization state has different structure between vis types
      externalVisContext?.attributes?.state?.visualization?.shape
  );
};
