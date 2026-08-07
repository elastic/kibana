/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverSessionTabAttributes } from '@kbn/saved-search-plugin/server';
import { UnifiedHistogramSuggestionType } from '@kbn/discover-utils';
import type { DiscoverSessionApiTab, DiscoverSessionWarning } from '../schema';

type StoredVisContext = DiscoverSessionTabAttributes['visContext'];
type ApiVisContext = DiscoverSessionApiTab['vis_context'];
type ApiSuggestionType = NonNullable<ApiVisContext>['suggestion_type'];

export interface StoredVisContextRequestData {
  dataViewId?: string;
  timeField?: string;
  timeInterval?: string;
  breakdownField?: string;
}

const isApiSuggestionType = (value: unknown): value is ApiSuggestionType =>
  value === UnifiedHistogramSuggestionType.lensSuggestion ||
  value === UnifiedHistogramSuggestionType.histogramForESQL ||
  value === UnifiedHistogramSuggestionType.histogramForDataView;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const createDroppedVisContextWarning = (tabId: string): DiscoverSessionWarning => ({
  type: 'dropped_property',
  tab_id: tabId,
  key: 'vis_context',
  message: 'Unable to transform vis context because the stored value is invalid.',
});

export const transformVisContextOut = (
  visContext: StoredVisContext,
  tabId: string
): { visContext: ApiVisContext | undefined; warnings: DiscoverSessionWarning[] } => {
  if (!visContext) {
    return { visContext: undefined, warnings: [] };
  }

  if (!isRecord(visContext)) {
    return {
      visContext: undefined,
      warnings: [createDroppedVisContextWarning(tabId)],
    };
  }

  if (Object.keys(visContext).length === 0) {
    return { visContext: undefined, warnings: [] };
  }

  if (
    !('suggestionType' in visContext) ||
    !('attributes' in visContext) ||
    !visContext.suggestionType ||
    !visContext.attributes ||
    !isApiSuggestionType(visContext.suggestionType)
  ) {
    return {
      visContext: undefined,
      warnings: [createDroppedVisContextWarning(tabId)],
    };
  }

  return {
    visContext: {
      suggestion_type: visContext.suggestionType,
      attributes: visContext.attributes,
    },
    warnings: [],
  };
};

export const transformVisContextIn = (
  visContext: ApiVisContext,
  requestData: StoredVisContextRequestData = {}
): StoredVisContext => {
  if (!visContext) {
    return undefined;
  }

  return {
    suggestionType: visContext.suggestion_type,
    requestData,
    attributes: visContext.attributes,
  };
};
