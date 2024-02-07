/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pick } from 'lodash';
import type { Suggestion } from '@kbn/lens-plugin/public';
import type { ExternalVisContext } from '../types';

export const toExternalVisContextJSONString = (
  visContext: ExternalVisContext | undefined
): string | undefined => {
  if (
    !visContext ||
    !visContext.requestData ||
    !visContext.attributes ||
    !visContext.suggestionType
  ) {
    return undefined;
  }

  return JSON.stringify(pick(visContext, ['attributes', 'requestData', 'suggestionType']));
};

export const fromExternalVisContextJSONString = (
  visContextJSON: string | undefined
): ExternalVisContext | undefined => {
  if (!visContextJSON) {
    return undefined;
  }

  let visContext: ExternalVisContext | undefined;

  try {
    visContext = JSON.parse(visContextJSON);

    if (!visContext?.requestData || !visContext.attributes || !visContext.suggestionType) {
      visContext = undefined;
      throw new Error('visContextJSON is invalid');
    }
  } catch {
    // nothing
  }

  return visContext;
};

export const isSuggestionAndVisContextCompatible = (
  suggestion: Suggestion | undefined,
  externalVisContext: ExternalVisContext | undefined
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
