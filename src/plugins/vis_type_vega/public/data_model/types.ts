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

import { AggParamsMapping, Filter } from 'src/plugins/data/public';
import { DslQuery } from 'src/plugins/data/common';

interface Coordinate {
  axis: {
    title: string;
  };
  field: string;
}

interface Encoding {
  x: Coordinate;
  y: Coordinate;
}

interface AutoSize {
  type: string;
  contains: string;
}

export interface VegaSpec {
  [index: string]: any;
  $schema: string;
  data?: Data;
  encoding?: Encoding;
  mark?: string;
  title?: string;
  autosize: AutoSize;
  projections?: any;
  width?: any;
  height?: any;
  padding?: any;
  _hostConfig?: any;
  config?: any;
}

export enum CONSTANTS {
  TIMEFILTER = '%timefilter%',
  CONTEXT = '%context%',
  LEGACY_CONTEXT = '%context_query%',
  TYPE = '%type%',
  SYMBOL = 'Symbol(vega_id)',
}

export interface Opts {
  [index: string]: any;
  [CONSTANTS.TIMEFILTER]?: boolean;
  gte?: string;
  lte?: string;
  format?: string;
  shift?: number;
  unit?: string;
}

export type Type = 'min' | 'max';

export interface TimeBucket {
  key_as_string: string;
  key: number;
  doc_count: number;
  [CONSTANTS.SYMBOL]: number;
}

export interface Bool {
  [index: string]: any;
  bool?: Bool;
  must?: DslQuery[];
  filter?: Filter[];
  should?: never[];
  must_not?: Filter[];
}

export interface Query {
  range?: { [x: number]: Opts };
  bool?: Bool;
}

export interface UrlObject {
  [index: string]: any;
  [CONSTANTS.TIMEFILTER]?: string;
  [CONSTANTS.CONTEXT]?: boolean;
  [CONSTANTS.LEGACY_CONTEXT]?: string;
  [CONSTANTS.TYPE]?: string;
  index?: string;
  body?: {
    aggs?: AggParamsMapping;
    query?: Query;
    timeout?: string;
  };
  size?: number;
  timeout?: string;
}

export interface Data {
  format?: {
    help?: string;
    property?: string;
  };
  values?:
    | {
        aggregations?: {
          time_buckets: TimeBucket[];
        };
      }
    | string;
  hits?: {
    hits?: any[];
    max_score?: number;
    total?: {
      relation: string;
      value: number;
    };
    timed_out?: boolean;
    took?: number;
  };
  _shards?: {
    failed?: number;
    skipped?: number;
    successful?: number;
    total?: number;
  };
  url?: UrlObject;
}

export interface CacheOptions {
  max: number;
  maxAge: number;
}

export interface CacheBounds {
  min: number;
  max: number;
}
