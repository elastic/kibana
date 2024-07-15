/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BrowserFields } from '@kbn/rule-registry-plugin/common';
import type { FieldDescriptor } from '@kbn/data-views-plugin/server';
import { BASE_RAC_ALERTS_API_PATH } from '../constants';
import { UseFetchAlertsFieldsQueryParams } from '../hooks/use_fetch_alerts_fields_query';

export const fetchAlertsFields = ({ http, featureIds }: UseFetchAlertsFieldsQueryParams) =>
  http.get<{ browserFields: BrowserFields; fields: FieldDescriptor[] }>(
    `${BASE_RAC_ALERTS_API_PATH}/browser_fields`,
    {
      query: { featureIds },
    }
  );
