/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AlertConsumers, isValidFeatureId, ValidFeatureId } from '@kbn/rule-data-utils';
import { useQuery } from '@tanstack/react-query';
import { HttpSetup } from '@kbn/core-http-browser';
import type { BrowserFields } from '../types/alerts_fields_types';
import type { QueryOptionsOverrides } from '../types/tanstack_query_utility_types';
import { fetchAlertsFields } from '../apis/fetch_alert_fields';

export interface UseFetchAlertsFieldsQueryParams {
  // Dependencies
  http: HttpSetup;
  // Params
  /**
   * Array of feature ids used for authorization and area-based filtering
   */
  featureIds: ValidFeatureId[];
  /**
   * Initial browser fields
   */
  initialBrowserFields?: BrowserFields;
}

const UNSUPPORTED_FEATURE_ID = AlertConsumers.SIEM;

export const queryKeyPrefix = ['alerts', fetchAlertsFields.name];

/**
 * Fetch alerts indexes browser fields for the given feature ids
 */
export const useFetchAlertsFieldsQuery = (
  { http, ...params }: UseFetchAlertsFieldsQueryParams,
  options?: QueryOptionsOverrides<typeof fetchAlertsFields>
) => {
  const { featureIds, initialBrowserFields } = params;

  const validFeatureIds = featureIds.filter(
    (fid) => isValidFeatureId(fid) && fid !== UNSUPPORTED_FEATURE_ID
  );

  return useQuery(
    queryKeyPrefix.concat(JSON.stringify(params)),
    () => fetchAlertsFields({ http, featureIds: validFeatureIds }),
    {
      enabled: validFeatureIds.length > 0,
      initialData: { browserFields: initialBrowserFields ?? {}, fields: [] },
      ...options,
    }
  );
};
