/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter, Query } from '@kbn/es-query';

import { TimeRange } from '../../../data/public';
import { DataView, DataViewField } from '../../../data_views/public';
import { OptionsListRequestBody, OptionsListResponse } from '../control_types/options_list/types';

export type OptionsListRequest = Omit<
  OptionsListRequestBody,
  'filters' | 'fieldName' | 'fieldSpec'
> & {
  timeRange?: TimeRange;
  field: DataViewField;
  dataView: DataView;
  filters?: Filter[];
  query?: Query;
};

export interface ControlsOptionsListService {
  runOptionsListRequest: (
    request: OptionsListRequest,
    abortSignal: AbortSignal
  ) => Promise<OptionsListResponse>;
}
