/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UiCounterMetricType } from '@kbn/analytics';
import { SerializedFieldFormat } from '../../../../field_formats/common';
import { ChartsPluginSetup } from '../../../../charts/public';

export interface Dimension {
  accessor: number;
  format: {
    id?: string;
    params?: SerializedFieldFormat<object>;
  };
}

export interface Dimensions {
  metric: Dimension;
  buckets?: Dimension[];
  splitRow?: Dimension[];
  splitColumn?: Dimension[];
}

export interface PieTypeProps {
  showElasticChartsOptions?: boolean;
  palettes?: ChartsPluginSetup['palettes'];
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
}
