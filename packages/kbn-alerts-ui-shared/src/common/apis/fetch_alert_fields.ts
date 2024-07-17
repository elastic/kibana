/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FieldDescriptor } from '@kbn/data-views-plugin/server';
import { HttpSetup } from '@kbn/core-http-browser';
import { ValidFeatureId } from '@kbn/rule-data-utils';
import type { BrowserFields } from '../types/alerts_fields_types';
import { BASE_RAC_ALERTS_API_PATH } from '../constants';

export interface FetchAlertsFieldsParams {
  // Dependencies
  http: HttpSetup;

  // Params
  /**
   * Array of feature ids used for authorization and area-based filtering
   */
  featureIds: ValidFeatureId[];
}

export const fetchAlertsFields = ({ http, featureIds }: FetchAlertsFieldsParams) =>
  http.get<{ browserFields: BrowserFields; fields: FieldDescriptor[] }>(
    `${BASE_RAC_ALERTS_API_PATH}/browser_fields`,
    {
      query: { featureIds },
    }
  );
