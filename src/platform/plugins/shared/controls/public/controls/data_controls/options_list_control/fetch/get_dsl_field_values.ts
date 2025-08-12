/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getEsQueryConfig } from '@kbn/data-plugin/public';
import { buildEsQuery } from '@kbn/es-query';
import {
  OptionsListDSLRequest,
  OptionsListResponse,
} from '../../../../../common/options_list/types';
import { coreServices, dataService } from '../../../../services/kibana_services';

export const getDSLFieldValues = async ({
  request,
  abortSignal,
}: {
  request: OptionsListDSLRequest;
  abortSignal: AbortSignal;
}) => {
  const index = request.dataView.getIndexPattern();

  const timeService = dataService.query.timefilter.timefilter;
  const { query, filters, dataView, timeRange, field, ...passThroughProps } = request;
  const timeFilter = timeRange ? timeService.createFilter(dataView, timeRange) : undefined;
  const filtersToUse = [...(filters ?? []), ...(timeFilter ? [timeFilter] : [])];
  const config = getEsQueryConfig(coreServices.uiSettings);
  const esFilters = [buildEsQuery(dataView, query ?? [], filtersToUse ?? [], config)];

  const requestBody = {
    ...passThroughProps,
    filters: esFilters,
    fieldName: field.name,
    fieldSpec: field,
    runtimeFieldMap: dataView.toSpec?.().runtimeFieldMap,
  };

  const result = await coreServices.http.fetch<OptionsListResponse>(
    `/internal/controls/optionsList/${index}`,
    {
      version: '1',
      body: JSON.stringify(requestBody),
      signal: abortSignal,
      method: 'POST',
    }
  );
  return result;
};
