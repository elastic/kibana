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

import { SchemaConfig } from '../../visualizations/public';

export enum AggTypes {
  SUM = 'sum',
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count',
}

export interface Dimensions {
  buckets: SchemaConfig[];
  metrics: SchemaConfig[];
}

export interface TableVisParams {
  type: 'table';
  perPage: number | '';
  showPartialRows: boolean;
  showMetricsAtAllLevels: boolean;
  sort: {
    columnIndex: number | null;
    direction: string | null;
  };
  showTotal: boolean;
  totalFunc: AggTypes;
  percentageCol: string;
  dimensions: Dimensions;
}
