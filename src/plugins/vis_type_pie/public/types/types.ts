/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { Position } from '@elastic/charts';
import { UiCounterMetricType } from '@kbn/analytics';
import { DatatableColumn, SerializedFieldFormat } from '../../../expressions/public';
import { PaletteOutput, ChartsPluginSetup } from '../../../charts/public';

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

export interface PieVisParams {
  type: 'pie';
  addTooltip: boolean;
  addLegend: boolean;
  legendPosition: Position;
  nestedLegend: boolean;
  dimensions: Dimensions;
  isDonut: boolean;
  palette: PaletteOutput;
  labels: {
    show: boolean;
    last_level: boolean;
    position: LabelPositions;
    values: boolean;
    truncate: number | null;
    valuesFormat: ValueFormats;
  };
}

export interface BucketColumns extends DatatableColumn {
  format?: {
    id?: string;
    params?: SerializedFieldFormat<object>;
  };
}

export enum LabelPositions {
  INSIDE = 'inside',
  DEFAULT = 'default',
}

export enum ValueFormats {
  PERCENT = 'percent',
  VALUE = 'value',
}

export interface PieTypeProps {
  showElasticChartsOptions?: boolean;
  palettes?: ChartsPluginSetup['palettes'];
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
}
