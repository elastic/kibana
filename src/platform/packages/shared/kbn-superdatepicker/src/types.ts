/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiSuperDatePickerProps } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { estypes } from '@elastic/elasticsearch';

export interface KbnSuperDatePickerProps extends EuiSuperDatePickerProps {
  enableEntireTimeRange?: boolean;
  uiSettings?: CoreStart['uiSettings'];
  http?: CoreStart['http'];
  dataView?: DataView;
  query?: QueryDslQueryContainer;
}

export interface UseCommonlyUsedRangesProps {
  uiSettings?: CoreStart['uiSettings'];
}

export interface EntireTimeRangePanelProps {
  onTimeChange: EuiSuperDatePickerProps['onTimeChange'];
  http?: CoreStart['http'];
  dataView?: DataView;
  query?: QueryDslQueryContainer;
}

interface GetTimeFieldRangeResponseTime {
  epoch: number;
  string: string;
}

export interface GetTimeFieldRangeOptions {
  index: string;
  timeFieldName?: string;
  query?: QueryDslQueryContainer;
  runtimeMappings?: estypes.MappingRuntimeFields;
  http: CoreStart['http'];
  signal?: AbortSignal;
}

export interface GetTimeFieldRangeResponse {
  success: boolean;
  start: GetTimeFieldRangeResponseTime;
  end: GetTimeFieldRangeResponseTime;
}
