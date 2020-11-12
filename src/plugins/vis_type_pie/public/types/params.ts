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

export interface Dimension {
  accessor: number;
  format: {
    id?: string;
    params?: { pattern?: string; [key: string]: any };
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
  dimensions: Dimensions;
  isDonut: boolean;
  labels: {
    show: boolean;
    values: boolean;
    last_level: boolean;
    truncate: number | null;
  };
}

export interface Column {
  // -1 value can be in a fake X aspect
  id: string | -1;
  name: string;
}

export interface Row {
  [key: string]: number | string | object;
}

export interface TableParent {
  table: Table;
  tables?: Table[];
  column: number;
  row: number;
  key: number;
  name: string;
}
export interface Table {
  columns: Column[];
  rows: Row[];
  $parent?: TableParent;
}
