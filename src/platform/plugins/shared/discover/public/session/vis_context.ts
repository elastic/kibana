/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_ESQL_DATA_SOURCE_TYPE } from '@kbn/as-code-data-views-schema';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import { UnifiedHistogramSuggestionType } from '@kbn/discover-utils';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { get, isPlainObject } from 'lodash';
import type { DiscoverSessionClient } from './api_client';

type ApiCreateData = Parameters<DiscoverSessionClient['create']>[0];
type ApiResponse = Awaited<ReturnType<DiscoverSessionClient['get']>>;
type ApiTab = ApiResponse['data']['tabs'][number];
type ApiSuggestionType = NonNullable<
  ApiCreateData['tabs'][number]['vis_context']
>['suggestion_type'];

interface EsqlVisContextFingerprint {
  dataViewId: string;
  timeField?: string;
}

// TODO: Move this mapping to a shared Discover module when the client and server use common
// session types. Keep both implementations aligned until then.
/** Restores a chart and keeps runtime-only values across an immediate save response. */
export const toRuntimeVisContext = (
  apiTab: ApiTab,
  previousTab: DiscoverSessionTab | undefined
): DiscoverSessionTab['visContext'] => {
  if (!apiTab.vis_context) {
    return undefined;
  }

  return {
    suggestionType: apiTab.vis_context.suggestion_type,
    attributes: apiTab.vis_context.attributes,
    requestData: getRuntimeRequestData(apiTab, previousTab),
  };
};

/** Removes runtime-only chart values before sending a tab to the API. */
export const toApiVisContext = (
  visContext: DiscoverSessionTab['visContext']
): ApiCreateData['tabs'][number]['vis_context'] | undefined => {
  if (
    !visContext ||
    !('suggestionType' in visContext) ||
    !isApiSuggestionType(visContext.suggestionType) ||
    !isRecord(visContext.attributes)
  ) {
    return undefined;
  }

  return {
    suggestion_type: visContext.suggestionType,
    attributes: visContext.attributes,
  };
};

/** Restores the ES|QL chart fingerprint or reuses the current value after a save. */
const getRuntimeRequestData = (apiTab: ApiTab, previousTab: DiscoverSessionTab | undefined) => {
  if (previousTab?.visContext && 'requestData' in previousTab.visContext) {
    return previousTab.visContext.requestData;
  }

  if (apiTab.data_source.type !== AS_CODE_ESQL_DATA_SOURCE_TYPE || !apiTab.vis_context) {
    return {};
  }

  const fingerprint = extractEsqlFingerprint(apiTab.vis_context.attributes);
  if (!fingerprint) {
    return {};
  }

  return {
    ...fingerprint,
    ...(apiTab.breakdown_field !== undefined &&
      apiTab.breakdown_field !== '' && { breakdownField: apiTab.breakdown_field }),
  };
};

/** Extracts the values needed to validate a stored ES|QL chart at runtime. */
const extractEsqlFingerprint = (
  attributes: Record<string, unknown>
): EsqlVisContextFingerprint | undefined => {
  const layers = get(attributes, 'state.datasourceStates.textBased.layers');
  if (!isRecord(layers)) {
    return undefined;
  }

  const layerIndexes = new Set<string>();

  for (const layer of Object.values(layers)) {
    if (isRecord(layer) && typeof layer.index === 'string' && layer.index.length > 0) {
      layerIndexes.add(layer.index);
    }
  }

  if (layerIndexes.size !== 1) {
    return undefined;
  }

  const [dataViewId] = layerIndexes;
  const adHocDataViews = get(attributes, 'state.adHocDataViews');

  if (!isRecord(adHocDataViews)) {
    return undefined;
  }

  const dataViewSpec = adHocDataViews[dataViewId];
  if (!isRecord(dataViewSpec) || dataViewSpec.type !== ESQL_TYPE) {
    return undefined;
  }

  return {
    dataViewId,
    ...(typeof dataViewSpec.timeFieldName === 'string' &&
      dataViewSpec.timeFieldName !== '' && { timeField: dataViewSpec.timeFieldName }),
  };
};

const isApiSuggestionType = (value: unknown): value is ApiSuggestionType =>
  value === UnifiedHistogramSuggestionType.lensSuggestion ||
  value === UnifiedHistogramSuggestionType.histogramForESQL ||
  value === UnifiedHistogramSuggestionType.histogramForDataView;

const isRecord = (value: unknown): value is Record<string, unknown> => isPlainObject(value);
