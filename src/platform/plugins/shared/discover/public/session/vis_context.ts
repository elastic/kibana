/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UnifiedHistogramSuggestionType } from '@kbn/discover-utils';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import type { UnifiedHistogramVisContext } from '@kbn/unified-histogram';
import { isPlainObject } from 'lodash';
import { extractEsqlFingerprint } from '../../common/session/extract_esql_fingerprint';
import type { DiscoverSessionApiDataInput, DiscoverSessionApiTab } from '../../server';

type ApiSuggestionType = NonNullable<
  DiscoverSessionApiDataInput['tabs'][number]['vis_context']
>['suggestion_type'];

// TODO: Move this mapping to a shared Discover module when the client and server use common
// session types. Keep both implementations aligned until then.
/** Converts an API chart and rebuilds its ES|QL compatibility fingerprint. */
export const fromApiVisContext = (
  visContext: DiscoverSessionApiTab['vis_context'],
  breakdownField: DiscoverSessionApiTab['breakdown_field']
): DiscoverSessionTab['visContext'] => {
  if (!visContext) {
    return undefined;
  }

  return {
    suggestionType: visContext.suggestion_type,
    attributes: visContext.attributes,
    requestData: getVisContextRequestData(visContext.attributes, breakdownField),
  };
};

/** Removes runtime-only chart values before sending a tab to the API. */
export const toApiVisContext = (
  visContext: DiscoverSessionTab['visContext']
): DiscoverSessionApiDataInput['tabs'][number]['vis_context'] | undefined => {
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

/** Rebuilds an ES|QL chart fingerprint from its saved attributes. */
const getVisContextRequestData = (
  attributes: Record<string, unknown>,
  breakdownField: DiscoverSessionApiTab['breakdown_field']
): UnifiedHistogramVisContext['requestData'] => {
  // A session saved in classic may still hold an ES|QL chart. Restore its fingerprint so
  // switching back to ES|QL can check whether the chart is still compatible.
  const fingerprint = extractEsqlFingerprint(attributes);
  if (!fingerprint) {
    return {};
  }

  return {
    ...fingerprint,
    ...(breakdownField !== undefined && breakdownField !== '' && { breakdownField }),
  };
};

const isApiSuggestionType = (value: unknown): value is ApiSuggestionType =>
  value === UnifiedHistogramSuggestionType.lensSuggestion ||
  value === UnifiedHistogramSuggestionType.histogramForESQL ||
  value === UnifiedHistogramSuggestionType.histogramForDataView;

const isRecord = (value: unknown): value is Record<string, unknown> => isPlainObject(value);
